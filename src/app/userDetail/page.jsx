'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function UserDetail() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');
    if (storedName && storedEmail) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) return;
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    router.push('/');
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <input
          className={styles.oldBookInput}
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.oldBookInput}
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className={styles.secondary} onClick={handleSubmit}>
          Continue
        </button>
      </main>
    </div>
  );
}
