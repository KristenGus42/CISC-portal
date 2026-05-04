import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue } from 'firebase/database';
import PersonnelForm from "./AddPersonnelHeader";

export default function IndividualPersonnel() {
    const db = getDatabase();

    return (
        <>
            <NavBar active={"personnel"}/>
            
            {/*Header Section*/}
            <AddPersonnelHeader />
        </>
    );
}