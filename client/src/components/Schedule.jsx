import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link } from "react-router";

export default function Schedule() {
  return (
    <>
        <NavBar active={"schedule"}/>
        <div>
            <h1>Shedule</h1>
        </div>
    </>
  );
}