type Props = {
  message?: string;
};

export default function EmptyState({ message = "No products found." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-sm">
      <p>{message}</p>
    </div>
  );
}
