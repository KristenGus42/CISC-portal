import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link } from "react-router";

export default function Schedule() {
  return (
    <>
        <NavBar active={"schedule"}/>
        <div className="m-4">
            <div className="d-flex justify-content-between align-items-start">
                {/* Change Dates */}
                <div style={{ background: "lightblue", padding: "1rem" }}>
                Change Dates
                </div>

                {/* Actions */}
                <div style={{ background: "lightgreen", padding: "1rem" }}>
                Actions
                </div>
            </div>

            {/* Schedule Container */}
            <div className="d-flex justify-content-center gap-4" id="schedule-container">

                {/* Position 1 */}
                <div className="d-flex flex-column position-slot">
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 1</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 2</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem" }}>Card 3</div>
                </div>

                {/* Position 2 */}
                <div className="d-flex flex-column position-slot">
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 1</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 2</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem" }}>Card 3</div>
                </div>

                {/* Position 3 */}
                <div className="d-flex flex-column position-slot">
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 1</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem", marginBottom: "0.5rem" }}>Card 2</div>
                    <div className="position-card" style={{ background: "white", padding: "0.5rem" }}>Card 3</div>
                </div>

            </div>
            </div>

            {/* Waitlist */}
            <div style={{ background: "lightgray", padding: "1rem", marginTop: "1rem" }}>
        </div>
    </>
  );
}