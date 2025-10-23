import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Stripe signature is missing" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify and construct the event
    const event = constructWebhookEvent(body, signature, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const weddingId = session.metadata?.wedding_id;
  const planId = session.metadata?.plan_id;

  if (!weddingId || !planId) {
    console.error("Missing wedding_id or plan_id in session metadata");
    return;
  }

  const subscription = session.subscription as string;
  const customerId = session.customer as string;

  // Create or update subscription in database
  await prisma.subscription.upsert({
    where: { wedding_id: weddingId },
    create: {
      wedding_id: weddingId,
      plan_id: planId,
      stripe_subscription_id: subscription,
      stripe_customer_id: customerId,
      status: "active",
      created_by: session.metadata?.user_id || null,
    },
    update: {
      stripe_subscription_id: subscription,
      stripe_customer_id: customerId,
      status: "active",
      updated_by: session.metadata?.user_id || null,
      updated_at: new Date(),
    },
  });

  console.log(
    `Subscription created for wedding ${weddingId}, subscription ${subscription}`
  );
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const weddingId = subscription.metadata?.wedding_id;
  const planId = subscription.metadata?.plan_id;

  if (!weddingId || !planId) {
    console.error("Missing wedding_id or plan_id in subscription metadata");
    return;
  }

  await prisma.subscription.upsert({
    where: { wedding_id: weddingId },
    create: {
      wedding_id: weddingId,
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    },
    update: {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updated_at: new Date(),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscription.id },
  });

  if (!existingSubscription) {
    console.error(
      `Subscription not found in database: ${subscription.id}`
    );
    return;
  }

  await prisma.subscription.update({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      updated_at: new Date(),
    },
  });

  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscription.id },
  });

  if (!existingSubscription) {
    console.error(
      `Subscription not found in database: ${subscription.id}`
    );
    return;
  }

  await prisma.subscription.update({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status: "canceled",
      canceled_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log(`Subscription deleted: ${subscription.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  if (!subscriptionId) {
    console.log("Invoice not associated with a subscription");
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscriptionId },
  });

  if (!subscription) {
    console.error(
      `Subscription not found for invoice: ${invoice.id}`
    );
    return;
  }

  // Record payment
  await prisma.payment.create({
    data: {
      wedding_id: subscription.wedding_id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      stripe_charge_id: invoice.charge as string,
      amount: invoice.amount_paid / 100, // Convert from cents to currency unit
      currency: invoice.currency,
      status: "succeeded",
      payment_method: invoice.payment_intent ? "card" : "unknown",
      description: `Subscription payment for period ${new Date(
        invoice.period_start * 1000
      ).toLocaleDateString()} - ${new Date(
        invoice.period_end * 1000
      ).toLocaleDateString()}`,
      receipt_url: invoice.hosted_invoice_url,
    },
  });

  console.log(`Payment recorded for invoice ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    console.log("Invoice not associated with a subscription");
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscriptionId },
  });

  if (!subscription) {
    console.error(
      `Subscription not found for invoice: ${invoice.id}`
    );
    return;
  }

  // Update subscription status to past_due
  await prisma.subscription.update({
    where: { stripe_subscription_id: subscriptionId },
    data: {
      status: "past_due",
      updated_at: new Date(),
    },
  });

  console.log(`Payment failed for invoice ${invoice.id}`);
}
