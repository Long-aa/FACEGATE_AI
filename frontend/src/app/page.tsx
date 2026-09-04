"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#080C14' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #00D4AA, #3B82F6)', margin: '0 auto 16px' }} />
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Đang tải...</p>
      </div>
    </div>
  );
}
