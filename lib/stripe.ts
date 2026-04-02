import Stripe from 'stripe';

// Lazily initialized so the module can be imported at build time without secrets.
// The error surfaces at runtime when Stripe is first called.
let _stripe: Stripe | null = null;

function getInstance(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-02-25.clover',
            typescript: true,
        });
    }
    return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
    get(_, prop: string | symbol) {
        return Reflect.get(getInstance(), prop);
    },
});

// Client-side Stripe for frontend
export const getStripePromise = () => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
    }

    return import('@stripe/stripe-js').then(({ loadStripe }) =>
        loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    );
};
