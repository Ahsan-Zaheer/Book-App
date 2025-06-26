import Image from "next/image";
import styles from "./page.module.css";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
              <h2 className="mb-4 fw-bold text-primary">📚 Logo</h2>

          <h1>Let&apos;s start writing your new book</h1>
       

        <div className={styles.ctas}>
          <Link
            className={styles.primary}
            href="/home"
          >
            
            
            <Icon icon="streamline-ultimate:pen-write"/>

            Write New Book
          </Link>
          <a
            
            className={styles.secondary}
          >
            Start with old one
          </a>
        </div>
      </main>
    
    </div>
  );
}
