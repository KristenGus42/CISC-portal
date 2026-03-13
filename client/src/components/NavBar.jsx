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
            <Navbar.Brand as={Link} to="/schedule">
                <img
                    alt="CISC Logo"
                    src="/img/cisc-logo.png"
                    height="30"
                    className="d-inline-block align-top"
                />
            </Navbar.Brand>
            <Nav className="me-auto">
                <Nav.Link as={Link} to="/schedule" className={active === "schedule" ? "active-nav-link" : undefined}>Schedule</Nav.Link>
                <Nav.Link as={Link} to="/case-library" className={active === "cases" ? "active-nav-link" : undefined}>Cases</Nav.Link>
            </Nav>
        </Container>
    </Navbar>
    );
}