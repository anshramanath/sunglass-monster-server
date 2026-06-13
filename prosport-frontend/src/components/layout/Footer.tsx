export default function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} proSPORT Sunglasses. All rights reserved.
      </div>
    </footer>
  );
}
