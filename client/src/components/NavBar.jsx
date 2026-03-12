import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link } from "react-router";

export function NavBar(props){
    const {active} = props;

    return (
    <Navbar className="bg-body-tertiary">
        <Container>
            <Navbar.Brand href="schedule">
            <img
                alt="CISC Logo"
                src="img/cisc-logo.png"
                height="30"
                className="d-inline-block align-top"
            />{' '}
            {/*CISC*/}
            </Navbar.Brand>
            <Nav className="me-auto">
            <Nav.Link href="schedule" className={active === "schedule" ? "active-nav-link" : undefined}>Schedule</Nav.Link>
            <Nav.Link href="case-library" className={active === "cases" ? "active-nav-link" : undefined}>Cases</Nav.Link>
            </Nav>
        </Container>
        </Navbar>
    );
}

