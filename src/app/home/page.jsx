import React from 'react'
import Sidebar from '../../../components/Sidebar'
import '../../../stylesheets/style.css'
import ChatScreen from '../../../components/ChatScreen'

export default function HomePage() {
  return (
    <div className="mainBg">
        <Sidebar/>
        <ChatScreen/>
    </div>
  )
}
