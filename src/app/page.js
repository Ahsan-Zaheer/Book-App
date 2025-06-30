'use client'; // needed for state in Next.js 13+ app directory

import { useState } from 'react';
import Image from "next/image";
import styles from "./page.module.css";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Home() {
  const [showInput, setShowInput] = useState(false);
  const [uuid, setUuid] = useState("");

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h2 className="mb-4 fw-bold" style={{ color: '#f4845f' }}>📚 Logo</h2>
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
              <Link href={`/home/${uuid}`}>
                <button className={`${styles.secondary} ${styles.continueBtn}`}>
                  Continue with this Book
                </button>
              </Link>
            )}
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
