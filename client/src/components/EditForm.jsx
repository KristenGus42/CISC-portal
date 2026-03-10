import { useState, useEffect } from 'react';

export default function EditFrom() {

  const [clientFormData, setClientFormData] = useState({
    
  });


  // Controlled form 
  const handleChange = (event) => {
    const { name, value } = event.target;
    const tempData = {...formData};
    tempData[name] = value;
    setFormData(tempData);
  };

  /*
  useEffect(() => {
  onValue(REF, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      setFormData(prev => ({ ...prev, ...data }));
    }
  });}, []);*/

  const handleSubmit = (event) => {
    /*event.preventDefault();
    firebaseSet(studentProfileRef, formData)
      .then(() => console.log("Profile saved"))
      .catch(error => alert("Save failed: " + error.message));*/
    console.log("Submitted.")
  };

  return (
    <div className="container py-5">
      <h1 className="fs-4 fw-bold mb-1">Contact Us</h1>
      <p className="small mb-4">Fill out the form below and we'll get back to you shortly.</p>

      <div className="row mb-3">
        <div className="d-flex align-items-center gap-3 my-4">
          <span className="text-muted small">Client Information</span>
          <hr className="flex-grow-1 m-0" />
        </div>
        <div className="col-2 pe-2">
          <label htmlFor="age" className="form-label fw-semibold small">Age</label>
          <input type="text" className="form-control" id="age" />
        </div>
        <div className="col-2 ps-2">
          <label htmlFor="sex" className="form-label fw-semibold small">Sex</label>
          <input type="text" className="form-control" id="sex" />
        </div>
        <div className="col-2 pe-2">
          <label htmlFor="householdSize" className="form-label fw-semibold small">Household Size</label>
          <input type="text" className="form-control" id="householdSize" />
        </div>
        <div className="col-5 ps-2">
          <label htmlFor="incomeLevel" className="form-label fw-semibold small">Income Level</label>
          <input type="text" className="form-control" id="incomeLevel" />
        </div>
        <div className="col-5 ps-2">
          <label htmlFor="address" className="form-label fw-semibold small">Address</label>
          <input type="text" className="form-control" id="address" />
        </div>
      </div>

      <div className="row mb-3">
         <div className="d-flex align-items-center gap-3 my-4">
          <span className="text-muted small"> Case Information</span>
          <hr className="flex-grow-1 m-0" />
        </div>
        <div className="col-2 pe-2">
          <label htmlFor="city" className="form-label fw-semibold small">City</label>
          <input type="text" className="form-control" id="city" />
        </div>
        <div className="col-2 ps-2">
          <label htmlFor="zip" className="form-label fw-semibold small">Zip</label>
          <input type="text" className="form-control" id="zip" />
        </div>
        <div className="col-2 pe-2">
          <label htmlFor="primaryLanguage" className="form-label fw-semibold small">Primary Language</label>
          <input type="text" className="form-control" id="primaryLanguage" />
        </div>
        <div className="col-5 ps-2">
          <label htmlFor="secondaryLanguage" className="form-label fw-semibold small">Secondary Language</label>
          <input type="text" className="form-control" id="secondaryLanguage" />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <button type="button" className="btn btn-primary w-100 py-2">Submit</button>
        </div>
      </div>
    </div>
  );
}