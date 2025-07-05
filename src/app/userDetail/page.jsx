'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { createUser } from '../../../utils/api';
import  Image  from 'next/image';
import logo from '../../../assets/logo.png'; 

export default function UserDetail() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');
    const isApiSheets = router.pathname === '/api/sheets';

    if (!isApiSheets && storedName && storedEmail) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) return;
    try {
      const user = await createUser(name, email);
      localStorage.setItem('userId', user._id);
    } catch (err) {
      console.error('Failed to save user', err);
    }
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    router.push('/');
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image src={logo} alt="Logo" width={180}  />
        <h1 className={styles.title}>Please Fill in the form to continue with the app</h1>
        <div className={`mb-2 ${styles.subTitle}`}> Book Writer Pro GPT is a powerful AI-driven system that helps you turn your ideas into a professionally written book in less than 7 days — no writing experience needed. From titles and outlines to full chapters, it does the heavy lifting so you can finally publish your story with confidence</div>
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
        <button className={styles.btn1} onClick={handleSubmit}>
          Continue
        </button>
      </main>
    </div>
  );
}
