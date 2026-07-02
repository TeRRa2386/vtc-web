import { Card } from "@/components/ui/card";

export default function AdminBlockedPage() {
  return (
    <Card className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-black">Access blocked</h1>
      <p className="mt-2 leading-7 text-muted-foreground">
        Your account is signed in but does not have the required admin role for this page.
      </p>
    </Card>
  );
}
