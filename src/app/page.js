'use client'; // needed for state in Next.js 13+ app directory

import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import  Image  from 'next/image';
import logo from '../../assets/logo.png'; 

export default function Home() {
  const [showInput, setShowInput] = useState(false);
  const [uuid, setUuid] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    if (!name || !email) {
      router.replace('/userDetail');
    }
  }, [router]);

  const handleContinue = async () => {
    setError("");
    if (!uuid) return;
    try {
      const res = await fetch(`/api/book/chat?bookId=${uuid}`);
      if (res.ok) {
        router.push(`/home/${uuid}`);
      } else {
        setError("Book not found");
      }
    } catch (err) {
      setError("Failed to load book");
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image src={logo} alt="Logo" width={150}  />
        <h1 className={styles.title}>Let&apos;s start writing your new book</h1>


        <div className={styles.ctas}>
          <Link className={styles.primary} href="/home">
            <Icon icon="streamline-ultimate:pen-write" />
            Write New Book
          </Link>

          {showInput && (
          <div className={styles.oldBookContainer}>
            <input
              type="text"
              placeholder="Enter Book ID"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className={styles.oldBookInput}
            />
            {uuid && (
                <button
                  onClick={handleContinue}
                  className={`${styles.secondary} ${styles.continueBtn} ms-3`}
                >
                  Continue with this Book
                </button>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}

          {showInput && uuid ? '' : (
            <button
              className={styles.secondary}
              onClick={() => setShowInput(!showInput)}
            >
              Start with old one
          </button>)}
        </div>

       
      </main>
    </div>
  );
}
