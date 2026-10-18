import type React from "react";
import {
  Body,
  Button,
  Container,
  Heading,
  Hr,
  Html,
  Img,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "react-email";
import { formatCurrency } from "@/lib/format";

export const TailwindWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: {
              brand: "#007291",
            },
          },
        },
      }}
    >
      {children}
    </Tailwind>
  );
};

/**
 * Signup verification email. The plain-text URL under the button is the
 * safety net for clients that strip anchors — without it the email is a dead
 * end (an earlier version rendered an empty body).
 */
export const SendVerificationEmail = ({ url }: { url: string }) => {
  return (
    <TailwindWrapper>
      <Html lang="en">
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-6 py-10">
            <Heading className="text-xl font-semibold text-gray-900">Confirm your email</Heading>
            <Text className="text-sm leading-6 text-gray-600">
              Welcome to PayGo. Tap the button below to confirm this address and finish setting up
              your account. The link expires in one hour.
            </Text>
            <Section className="py-2">
              <Button
                href={url}
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white"
              >
                Confirm email
              </Button>
            </Section>
            <Text className="text-xs leading-5 text-gray-500">
              If the button doesn't work, paste this link into your browser:
              <br />
              <span className="break-all">{url}</span>
            </Text>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-xs text-gray-500">
              Didn't create a PayGo account? You can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    </TailwindWrapper>
  );
};

export interface PriceDropAlertProps {
  productTitle: string;
  /** Product image URL, when Channel3 has one. */
  imageUrl: string | null;
  /** Absolute link to the product page (attribution-friendly single entry point). */
  productUrl: string;
  /** The price the user saw when adding the product (or the last alerted price). */
  previousPrice: number;
  /** The live price that triggered the alert. */
  currentPrice: number;
  currency: string;
}

/** Price-drop alert for a watched product. */
export const PriceDropAlert = ({
  productTitle,
  imageUrl,
  productUrl,
  previousPrice,
  currentPrice,
  currency,
}: PriceDropAlertProps) => {
  return (
    <TailwindWrapper>
      <Html lang="en">
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-lg px-6 py-10">
            <Heading className="text-xl font-semibold text-gray-900">
              A price you're watching just dropped
            </Heading>
            <Text className="text-sm leading-6 text-gray-600">
              {productTitle} is now cheaper than the price you saw when you added it to your
              watchlist.
            </Text>
            <Section className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              {imageUrl ? <Img src={imageUrl} alt="" width={132} className="rounded-lg" /> : null}
              <Text className="text-sm font-medium text-gray-900">{productTitle}</Text>
              <Text className="text-sm text-gray-500 line-through">
                {formatCurrency(previousPrice, currency)}
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {formatCurrency(currentPrice, currency)}
              </Text>
            </Section>
            <Section className="py-2">
              <Button
                href={productUrl}
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white"
              >
                See the deal
              </Button>
            </Section>
            <Text className="text-xs leading-5 text-gray-500">
              If the button doesn't work, paste this link into your browser:
              <br />
              <span className="break-all">{productUrl}</span>
            </Text>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-xs text-gray-500">
              You're receiving this because {productTitle} is on your PayGo watchlist. Remove it
              from the watchlist page to stop these emails.
            </Text>
          </Container>
        </Body>
      </Html>
    </TailwindWrapper>
  );
};
