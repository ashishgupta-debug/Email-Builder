import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";


const apiURL = process.env.REACT_APP_API_URL;

export default function Home() {
  const [isEditing, setIsEditing] = useState(false);
  const [id, setid] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState("");
  const [emailConfig, setEmailConfig] = useState({
    title: "",
    content: "",
    footer: "",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);

  const notify = (message, type = "info") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  }; 

//   Function to handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setEmailConfig((prevConfig) => ({
        ...prevConfig,
        imageUrl: URL.createObjectURL(file), // Creates a URL for the selected file
      }));
    }
  };


  // Function to create a new template
  const handleNewTemplate = async () => {
    // Check if the current configuration is already empty
    if (
      !emailConfig.title &&
      !emailConfig.content &&
      !emailConfig.footer &&
      !emailConfig.imageUrl &&
      !imageFile
    ) {
      // Use Swal.fire for warning notification
      Swal.fire({
        icon: "warning",
        title: "No changes made",
        text: "You are already in a new template.",
      });
      return;
    }

    // Show confirmation dialog using Swal.fire
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Unsaved changes will be lost. Do you want to create a new template?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, create new template",
      cancelButtonText: "No, cancel",
    });

    if (result.isConfirmed) {
      // Reset the template
      setIsEditing(false);
      setEmailConfig({
        title: "",
        content: "",
        footer: "",
        imageUrl: "",
      }); // Clear the email configuration
      setImageFile(null); // Clear the selected image file
      setid(""); // Reset template ID

      notify("A new template has been created.", "success");
    } else {
      console.log("Creating new template canceled.");
    }
  };

  useEffect(() => {
    if (imageFile) {
      console.log("Image file updated:", imageFile.name);
    }
  }, [setImageFile]);

//   Function to fetch all templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get( apiURL + "/getAllTemplates" );
      setTemplates(response.data); // Save templates to state
      setLoading(false);
    } catch (error) {
      notify("Error fetching templates.", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    axios.get( apiURL + "/getEmailLayout" ).then((response) => {
      setLayout(response.data);
    });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailConfig({ ...emailConfig, [name]: value });
  };

  const handleImageUpload = async () => {
    try {
      if (!imageFile) {
        notify("Please select an image before uploading.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await axios.post(
        apiURL + "/uploadImage",
        formData
      );
      setEmailConfig({ ...emailConfig, imageUrl: response.data.imageUrl });
      notify("Image uploaded successfully!", "success");
    } catch (error) {
      notify("Error uploading image. Please try again.", "error");
    }
  };

  // Reference for the file input field
  const fileInputRef = useRef(null);

  const handleClearImage = () => {
    setImageFile(null); // Clear image file
    setEmailConfig((prevConfig) => ({
      ...prevConfig,
      imageUrl: "", // Ensure the image URL is cleared when the image is removed
    }));
    fileInputRef.current.value = ""; // Reset the file input value
    notify("Image removed sucessfully", "success");
  };

  const handleSave = async () => {
    // Validate if the title and body are provided
  if (!emailConfig.title || !emailConfig.content) {
    notify("Title and body are required fields.", "error");
    return; // Stop further execution if validation fails
  }
    // Show confirmation alert using SweetAlert with a 'question' icon
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to save this template?",
      icon: "question", // Changed to 'question' for confirmation
      showCancelButton: true,
      confirmButtonText: "Yes, save it!",
      cancelButtonText: "No, cancel!",
    });

    // If the user confirms the action, proceed with saving the template
    if (result.isConfirmed) {
      try {
        // Prepare the email config data to send to the backend
        const emailConfigData = {
          templateName: emailConfig.title, // Assuming title is the template name
          body: emailConfig.content,
          footer: emailConfig.footer,
          imageUrl: emailConfig.imageUrl,
        };

        // Make the API call to save the configuration
        const response = await axios.post(
          apiURL + "/uploadEmailConfig",
          emailConfigData
        );

        if (response.status === 201) {
          notify("Template saved successfully!", "success"); // Success alert
          fetchTemplates();
        } else {
          notify("Failed to save the template. Please try again.", "error"); // Error alert
        }
      } catch (error) {
        notify("An error occurred while saving the template.", "error"); // Catching other errors
        console.error("Error saving template:", error);
      }
    } else {
      // If the user cancels, you can show a cancellation message or do nothing
      notify("The template was not saved.", "info");
    }
  };

  const handleUpdate = async (id) => {
    // Validate if the title and body are provided
  if (!emailConfig.title || !emailConfig.content) {
    notify("Title and body are required fields.", "error");
    return; // Stop further execution if validation fails
  }
    // Show confirmation alert using SweetAlert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to update this template?",
      icon: "question", // This makes it look like a confirmation dialog
      showCancelButton: true,
      confirmButtonText: "Yes, update it!",
      cancelButtonText: "No, cancel!",
    });

    if (result.isConfirmed) {
      try {
        const emailConfigData = {
          templateName: emailConfig.title, // Assuming title is the template name
          body: emailConfig.content,
          footer: emailConfig.footer,
          imageUrl: emailConfig.imageUrl,
        };
        await axios.put(
          apiURL + `/updateTemplate/${id}`,
          emailConfigData
        );
        notify("Template updated successfully!", "success"); // Success message
        fetchTemplates();
      } catch (error) {
        console.error("Error updating the template", error);
        notify("Failed to update the template. Please try again.", "error"); // Error message
      }
    } else {
      // If the user cancels, you can show a cancellation message or simply do nothing
      notify("Template update has been cancelled.");
    }
  };

  const handleDelete = async (id) => {
    console.log(id);

    // Show confirmation dialog using SweetAlert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this template? This action cannot be undone.",
      icon: "warning", // Warning icon
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
    });

    if (result.isConfirmed) {
      try {
        // Make the API call to delete the template
        await axios.delete( apiURL + `/deleteTemplate/${id}` );

        // Update the UI by removing the deleted template from the state
        setTemplates(templates.filter((template) => template._id !== id));

        // If the deleted template is the one being edited, reset the edit state
        if (id === id) {
          setIsEditing(false);
          setEmailConfig({
            title: "",
            content: "",
            footer: "",
            imageUrl: "",
          });
          setImageFile(null);
        }
        // Notify the user of success
        notify("Template deleted successfully!", "success");
      } catch (error) {
        console.error("Error deleting the template:", error);
        notify("Failed to delete the template. Please try again.", "error");
      }
    } else {
      // Optional: Notify the user that the action was canceled
      notify("Template deletion has been canceled.");
    }
  };

  const handleDownload = async () => {
    // Show confirmation dialog using SweetAlert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to download this template?",
      icon: "question", // Question icon
      showCancelButton: true,
      confirmButtonText: "Yes, download it!",
      cancelButtonText: "No, cancel!",
    });

    if (result.isConfirmed) {
      try {
        console.log("Sending request with templateName:", emailConfig.title);
        const response = await axios.post(
          apiURL + "/renderAndDownloadTemplate",
          { templateName: emailConfig.title }, // Send only templateName
          { responseType: "blob" }
        );

        // Check if the response contains data
        if (!response.data) {
          throw new Error("No data received from server");
        }

        // Process the response and download the file
        const blob = new Blob([response.data], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "emailTemplate.html";
        document.body.appendChild(link); // Append link to the DOM
        link.click();
        document.body.removeChild(link); // Remove link after clicking
        URL.revokeObjectURL(url); // Clean up the object URL

        // Notify the user of success using SweetAlert
        notify("Template downloaded successfully!", "success");
      } catch (error) {
        console.error("Error downloading the template:", error);

        // Notify the user of failure using SweetAlert
        Swal.fire(
          "Error",
          "Failed to download the template. Please try again.",
          "error"
        );
      }
    } else {
      // Optional: Notify the user that the action was canceled
      notify("Template download has been canceled.");
    }
  };

  // Handle template click to load it into the preview and settings section
  const handleTemplateClick = async (template) => {
    // Show confirmation dialog using SweetAlert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to edit this template?",
      icon: "question", // You can use "question" icon for confirmation
      showCancelButton: true,
      confirmButtonText: "Yes, edit it!",
      cancelButtonText: "No, cancel",
    });

    if (result.isConfirmed) {
      // Proceed with editing the template
      setIsEditing(true);
      setid(template._id);
      setImageFile(template.imageUrl);
      setEmailConfig({
        title: template.templateName,
        content: template.body,
        footer: template.footer || "",
        imageUrl: template.imageUrl || "",
      });
    } else {
      // Optionally, show a message that the action was canceled
      Swal.fire("Cancelled", "No changes were made to the template.", "info");
    }
  };

  return (
    <div className="w-full h-full">
      <ToastContainer />
      <div className="flex flex-row gap-2 pt-14">
        <div className="w-full border">
          <h2 className="text-center text-3xl font-semibold p-2 text-slate-700 border">
            Preview
          </h2>
          <div
            dangerouslySetInnerHTML={{
              __html: layout
                .replace("{{title}}", emailConfig.title.replace(/\n/g, "<br>"))
                .replace(
                  "{{content}}",
                  emailConfig.content.replace(/\n/g, "<br>")
                )
                .replace(
                  "{{footer}}",
                  emailConfig.footer.replace(/\n/g, "<br>")
                )
                .replace("{{imageUrl}}", emailConfig.imageUrl || ""),
            }}
          />
        </div>

        <div className="w-full border">
          <h2 className="text-center text-3xl font-semibold p-2 text-slate-700 border">
            Setting
          </h2>
          <div className="m-3 text-slate-700 flex flex-col gap-3">
            <div className="flex justify-end pr-2">
              <button
                onClick={handleNewTemplate}
                className="border bg-slate-500 text-white font-semibold rounded-lg w-40 min-h-12 flex justify-center items-center transition-all transform hover:scale-105 duration-300 ease-in-out shadow-md"
              >
                <span>Click for New Template</span>
              </button>
            </div>
            <div className="flex flex-col">
              <label>Title:</label>
              <input
                className="border min-h-10 p-2 focus:outline-none"
                type="text"
                name="title"
                placeholder="Template name (required)"
                required
                value={emailConfig.title}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-col">
              <label>Content:</label>
              <textarea
                className="border p-2 focus:outline-none"
                name="content"
                placeholder="Body of email (required)"
                required
                value={emailConfig.content}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-col">
              <label>Footer:</label>
              <input
                className="border min-h-10 p-2 focus:outline-none"
                type="text"
                name="footer"
                placeholder="Footer for email (optional)"
                value={emailConfig.footer}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-col mt-2 w-52">
              <label>Image:</label>
              <input
                ref={fileInputRef} // Use the ref to reset the input
                type="file"
                onChange={handleImageChange}
              />
              {imageFile ? (
                <div>
                  <p className="text-base m-2 text-slate-500 ">
                    Image selected{" "}
                  </p>
                  <button
                    className="bg-slate-300 w-36 mb-2 border rounded-lg"
                    onClick={handleClearImage}
                  >
                    Clear Image
                  </button>
                </div>
              ) : (
                <p className="text-sm m-2 text-slate-500">
                  No image selected. Please choose an image.
                </p>
              )}
              <button
                className="bg-slate-300 w-36 border rounded-lg"
                onClick={handleImageUpload}
              >
                Upload Image
              </button>
            </div>
            <div>
              {!isEditing ? (
                <button
                  className="bg-slate-300 mt-5 border rounded-lg w-60 min-h-10 flex justify-center items-center transition-all transform hover:scale-105 duration-300 ease-in-out shadow-md ml-40"
                  onClick={handleSave}
                >
                  Save Template
                </button>
              ) : (
                <button
                  className="bg-slate-300 mt-5 border rounded-lg w-60 min-h-12 flex justify-center items-center transition-all transform hover:scale-105 duration-300 ease-in-out shadow-md ml-40"
                  onClick={() => handleUpdate(id)}
                >
                  Update Template
                </button>
              )}
            </div>
            <div>
              <p className="text-center text-sm mt-5 text-slate-500">
                Before download make sure you have saved the template
              </p>
              <button
                className="bg-slate-400 mt-2 border rounded-lg w-60 min-h-12 flex justify-center items-center transition-all transform hover:scale-105 duration-300 ease-in-out shadow-md ml-40"
                onClick={handleDownload}
              >
                Download Template
              </button>
            </div>
            <div></div>
          </div>
        </div>
      </div>

      <div className="z-50">
        <h2 className="text-center text-3xl font-semibold pt-10 text-slate-700 border">Templates</h2>
        {loading ? (
          <p className="text-center mt-5 text-slate-600">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-center mt-5 text-slate-600">No templates found.</p>
        ) : (
          <ul>
            {templates.map((template) => (
              <li
                key={template._id}
                className="m-10 border p-4 rounded transition-transform transform hover:scale-105 duration-300 ease-in-out"
                onClick={() => handleTemplateClick(template)}
              >
                <h3 className="text-lg font-semibold">
                  {template.templateName}
                </h3>
                <p>
                  <strong>Body:</strong> {template.body.trim().slice(0, 100)}
                  {template.body.length > 100 && "..."}
                </p>
                {template.footer && (
                  <p>
                    <strong>Footer:</strong> {template.footer}
                  </p>
                )}
                {template.imageUrl && (
                  <img
                    src={template.imageUrl}
                    alt="Template"
                    className="mt-2 w-32 h-32 object-cover"
                  />
                )}
                {/* Edit and Delete Button */}
                <div className="flex flex-col gap-5 justify-center items-center m-auto ">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent template click from firing
                      handleTemplateClick(template);
                    }}
                    className="px-4 py-2 bg-slate-400 text-white rounded-md hover:bg-slate-500 transition-transform transform hover:scale-110 duration-300 ease-in-out"
                  >
                    Edit Template
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent template click from firing
                      handleDelete(template._id);
                    }}
                    className="px-4 py-2 bg-slate-400 text-white rounded-md hover:bg-slate-500 transition-transform transform hover:scale-110 duration-300 ease-in-out"
                  >
                    Delete Template
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
