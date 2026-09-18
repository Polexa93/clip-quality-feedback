import { NavLink, Route, Routes } from "react-router-dom";
import { ClipsPage } from "./pages/ClipsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <div className="app">
      <nav className="nav">
        <span className="nav__brand">Clip Quality Feedback</span>
        <NavLink to="/" end>
          Clips
        </NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<ClipsPage />} />
          <Route path="/clips/:id" element={<ReviewPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
