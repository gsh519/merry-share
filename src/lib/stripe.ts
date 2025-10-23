import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({
  priceId,
  customerId,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
}: {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: customerId,
    customer_email: !customerId ? customerEmail : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  });

  return session;
}

/**
 * Create a Stripe customer
 */
export async function createCustomer({
  email,
  name,
  metadata,
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });

  return customer;
}

/**
 * Get a Stripe subscription
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
) {
  if (cancelAtPeriodEnd) {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } else {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
}

/**
 * Create a Stripe product
 */
export async function createProduct({
  name,
  description,
  metadata,
}: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}) {
  const product = await stripe.products.create({
    name,
    description,
    metadata,
  });

  return product;
}

/**
 * Create a Stripe price
 */
export async function createPrice({
  productId,
  unitAmount,
  currency = "jpy",
  interval = "month",
  metadata,
}: {
  productId: string;
  unitAmount: number;
  currency?: string;
  interval?: "day" | "week" | "month" | "year";
  metadata?: Record<string, string>;
}) {
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency,
    recurring: {
      interval,
    },
    metadata,
  });

  return price;
}

/**
 * Construct Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
