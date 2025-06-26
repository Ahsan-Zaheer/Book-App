import React from "react";
import { Icon } from "@iconify/react";
import "../stylesheets/style.css"

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="mb-4 fw-bold text-primary">📚 Logo</h2>

      <div className="d-flex gap-2 mb-4">
        <button className="btn-1">+ New Book</button>
        <button className="btn-2">
          <Icon icon="icon-park-twotone:search" className=" text-light" />
        </button>
      </div>

      <hr />
      <div className="s-sec1">
        <p>Your Books</p>
        <a className="clear">Clear All</a>
      </div>
      <hr />

      <ul className="nav nav-pills flex-column h-100 ">
        <li className="nav-item">
          <button className="nav-link text-start text-dark">
          <Icon icon="tabler:book" className="me-2" />

            
            Book Title
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link text-start text-dark">
          <Icon icon="tabler:book" className="me-2" />

            
            Book Title
          </button>
        </li>
        
        <div className="bottom-links">
        <li>
          <button className="nav-link text-start text-dark">
          <Icon icon="grommet-icons:favorite" className="me-2" />

            Favorites
          </button>
        </li>
        <li>
          <button className="nav-link text-start text-dark">
          <Icon icon="weui:setting-outlined" className="me-2" />

            Settings
          </button>
        </li>
        </div>
      </ul>
    </div>
  );
}
