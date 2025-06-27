'use client';

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Icon } from "@iconify/react";
import "../stylesheets/style.css";

export default function SidebarWrapper() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="d-flex">
      {/* Toggle Button */}
      <button
        className="toggle-btn"
        onClick={() => setIsVisible((prev) => !prev)}
      >
        <Icon icon={isVisible ? "mdi:chevron-left" : "mdi:chevron-right"} />
      </button>

      {/* Sidebar */}
      {isVisible && <Sidebar />}
    </div>
  );
}
