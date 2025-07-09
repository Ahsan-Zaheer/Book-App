'use client';

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import "../stylesheets/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from '../assets/logo.png'; 


export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [titles, setTitles] = useState([]);
  const router = useRouter();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  
  useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth <= 600) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  };

  handleResize();

  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);


  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("book_titles") || "[]");
    setTitles(stored);
    const refresh = () => {
      const updated = JSON.parse(localStorage.getItem("book_titles") || "[]");
      setTitles(updated);
    };
    window.addEventListener("titlesUpdated", refresh);
    return () => window.removeEventListener("titlesUpdated", refresh);
  }, []);

  const handleSelect = (id) => {
    router.push(`/home/${id}`);
  };

  const clearAll = () => {
    localStorage.removeItem("book_titles");
    titles.forEach((t) => localStorage.removeItem(`chat_${t.id}`));
    setTitles([]);
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header with Logo and Toggle */}
      <div className="sidebar-header d-flex justify-content-between align-items-center mb-4">
        {!isCollapsed && (
          <h2 className="fw-bold d-flex justify-content-end align-items-end" style={{ color: '#0f01ff', fontSize: "30px" }}> <Link href="/" style={{ color: '#0f01ff' }}> <Image src={logo} width={120} alt="logo"/>  </Link>  <span className="beta">Beta</span></h2>
        )}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <Icon icon={isCollapsed ? "line-md:arrow-right" : "humbleicons:bars"} width="24" />
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          <div className="d-flex gap-2 mb-4">
           <Link href="/home"><button className="btn-1" >+ New Book</button></Link>
          </div>

          <hr />
          <div className="s-sec1">
            <p>Your Books</p>
            <a className="clear" onClick={clearAll}>Clear All</a>
          </div>
          <hr />

         <ul
            className="flex-column"
            style={{
              maxHeight: '100%',
              overflowY: 'auto',
              padding: '0px'
            }}
          >
            {titles.map((b) => (
              <li className="nav-item" key={b.id}>
                <button
                  className="nav-link my-4 text-start w-100 text-truncate"
                  onClick={() => handleSelect(b.id)}
                  style={{ whiteSpace: 'normal' }} // prevents multiline overflow
                >
                  <Icon icon="tabler:book" className="me-2" />
                  {b.title}
                </button>
              </li>
            ))}



            <div className="bottom-links">
              {/* <li>
                <button className="nav-link text-start">
                  <Icon icon="grommet-icons:favorite" className="me-2" />
                  Favorites
                </button>
              </li>
              <li>
                <button className="nav-link text-start">
                  <Icon icon="grommet-icons:trash" className="me-2" />
                  Trash
                </button>
              </li> */}
              {/* <li>
                <button className="nav-link text-start">
                  <Icon icon="weui:setting-outlined" className="me-2" />
                  Settings
                </button>
              </li> */}
            </div>
          </ul>
        </>
      )}
    </div>
  );
}
