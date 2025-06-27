'use client';

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import "../stylesheets/style.css";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header with Logo and Toggle */}
      <div className="sidebar-header d-flex justify-content-between align-items-center mb-4">
        {!isCollapsed && (
          <h2 className="fw-bold" style={{ color: '#f4845f' }}>📚 Logo</h2>
        )}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <Icon icon={isCollapsed ? "line-md:arrow-right" : "humbleicons:bars"} width="24" />
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          <div className="d-flex gap-2 mb-4">
            <button className="btn-1">+ New Book</button>
            <button className="btn-2">
              <Icon icon="icon-park-twotone:search" className="text-dark" />
            </button>
          </div>

          <hr />
          <div className="s-sec1">
            <p>Your Books</p>
            <a className="clear">Clear All</a>
          </div>
          <hr />

          <ul className="nav nav-pills flex-column h-100">
            <li className="nav-item">
              <button className="nav-link text-start">
                <Icon icon="tabler:book" className="me-2" />
                Book Title
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link text-start">
                <Icon icon="tabler:book" className="me-2" />
                Book Title
              </button>
            </li>

            <div className="bottom-links">
              <li>
                <button className="nav-link text-start">
                  <Icon icon="grommet-icons:favorite" className="me-2" />
                  Favorites
                </button>
              </li>
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
