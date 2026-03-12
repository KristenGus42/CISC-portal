import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link } from "react-router";

export default function Index() {

  return (
    <>
      <h1>Future login/landing page</h1>
      <p className="mt-3">
        <Link className="btn button col-3 py-3" to={"../schedule"} role="button">
          Login/Signin
        </Link>
      </p>
    </>
  );
}