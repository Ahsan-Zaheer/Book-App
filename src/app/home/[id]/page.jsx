'use client';
import React from 'react';
import Sidebar from '../../../../components/Sidebar';
import '../../../../stylesheets/style.css';
import ChatScreen from '../../../../components/ChatScreen';
import { useParams } from 'next/navigation';

export default function HomeBookPage() {
  const params = useParams();
  const { id } = params;
  return (
    <div className="mainBg">
      <Sidebar />
      <ChatScreen initialBookId={id} />
    </div>
  );
}
