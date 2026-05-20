import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function PaystackRedirect() {
  const router = useRouter();
  const { reference } = useLocalSearchParams();

  useEffect(() => {
    if (!reference) return;

    const verifyPayment = async () => {
      try {
        const res = await fetch(
          `https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/paystack-callback?reference=${reference}`
        );

        const result = await res.json();

        if (result.status === "completed") {
          router.replace("/registration");
        } else {
          alert("Payment failed. Try again.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    verifyPayment();
  }, [reference]);

  return null;
}
