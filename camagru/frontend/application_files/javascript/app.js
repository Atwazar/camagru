import { fetchWithToken } from "./fetch.js"
import { setLoginView } from "./login.js"
import { setRegisterView } from "./register.js"
import { set404View } from "./404.js";
import { getArgFromURL } from "./utils.js";
import { setValidateAccountView } from "./validate.js";
import { setForgotPasswordView } from "./forgot.js";
import { setResetPasswordView } from "./reset.js";
import { setGalleryView } from "./gallery.js";
import { setAddNewPictureView } from "./add.js";
import { setSinglePhotoView } from "./single.js";

export const state = {
	notifSocket: null,
};

export function setNavbarHtml(user) {
    const container = document.getElementById("navbar");
    container.innerHTML = `
        <nav class="navbar">
            <div class="nav-left">
                <a href="#gallery" class="logo">Camagru</a>
            </div>
            <div class="nav-center">
                <input type="text" id="searchBar" placeholder="Search for a user">
            </div>
            <div class="nav-right">
                <a href="#notifications" class="notifications">
                    🔔 <span id="notificationCount">3</span>
                </a>
                <a href="#add-new-picture" class="add-picture-button">➕ Add Photo</a>
                <div class="profile">
                    <img src="${user.profile_picture}" alt="Profile" class="profile-pic">
                    <span class="username">${user.username}</span>
                    <div class="dropdown">
                        <a href="#personnal-information">My Profile</a>
                        <a href="#" id="logoutButton">Logout</a>
                    </div>
                </div>
            </div>
        </nav>
    `;    

    const profile = container.querySelector(".profile");
    profile.addEventListener("click", () => {
        profile.classList.toggle("open");
    });

    const logoutButton = document.getElementById("logoutButton");
    logoutButton.addEventListener("click", (event) => {
        event.preventDefault();
        document.cookie = `accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        document.cookie = `refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        window.location.hash = "login";
    });
}


export async function loadPage(page) {
	const contentContainer = document.getElementById("center-box");
	const innerContent = document.getElementById("innerContent");
    let user;
	try {
		const response = await fetchWithToken('/api/users/getuser/');
		const data = await response.json();
        user = data.user;
        console.log(user);
	} catch (error) {
        document.getElementById("navbar").innerHTML = "";
		console.log(error)
		if (page !== "login" && page !== "register" && page!=="forgot-password" && !page.startsWith("validate-account") && !page.startsWith("reset-password")) {
			window.location.hash = "login";
			return;
        } else {
            switch (page) {
                case "login":
                    setLoginView(innerContent);
                    break;
                case "register":
                    setRegisterView(innerContent);
                    break;
                case "forgot-password":
                    setForgotPasswordView(innerContent);
                    break;
                default:
                    let argument;
                    if (page.startsWith("validate-account/")) {
                        argument = getArgFromURL(page);
                        setValidateAccountView(innerContent, argument);
                    } else if (page.startsWith("reset-password/")) {
                        argument = getArgFromURL(page);
                        setResetPasswordView(innerContent, argument);   
                    }
                }
            return;
            }
        }
    const path = window.location.pathname;
	if (path !== '/') {
		set404View(innerContent);
		return;
	} else if (page === "login" || page === "register" || page==="forgot-password" || page.startsWith("validate-account") || page.startsWith("reset-password")) {
		window.location.hash = "gallery";
		console.log("logged in, redirect to home");
		return;
	} else {
		try {
            setNavbarHtml(user);
			switch (page) {
                case "gallery":
                    setGalleryView(innerContent);
                    break;
                case "personnal-information":
                    setPersonnalInformationView(innerContent, user);
                    break;
                case "add-picture":
                    setAddNewPictureView(innerContent);
                    break;
                case "add-new-picture":
                    setAddNewPictureView(innerContent);
                    break;
                default:
                    let argument;
                    if (page.startsWith("single-picture/")) {
                        argument = getArgFromURL(page);
                        setSinglePhotoView(innerContent, argument);
                    } else {
                        set404View(innerContent);
                    }
                    break;
				// case "profile":
				// 	setProfileView(innerContent);
				// 	break;
				// case "gallery":
				// 	setGalleryView(innerContent);
				// 	break;
				// case "personnal-data":
				// 	setpersonalDataView(innerContent);
				// 	break;
				// case "newPicture":
				// 	setNewPicture(innerContent);
				// 	break;
				}
		} catch (error) {
			console.log("Error in setView:", error);
		}
	}
}

function handleNavigation(event) {
	event.preventDefault();

	if (event.target.hasAttribute("data-bs-toggle") && event.target.getAttribute("data-bs-toggle") === "tab") {
		return;
	}

	const newPage = event.target.getAttribute("href")?.substring(1);

	if (newPage) {
		window.history.pushState({ page: newPage }, newPage, '/#' + newPage);
		loadPage(newPage);
	}
}

export function attachNavigationListeners() {
	const links = document.querySelectorAll("a[href^='#']");
	links.forEach((link) => {
		link.removeEventListener("click", handleNavigation);
		link.addEventListener("click", handleNavigation);
	});
}

window.addEventListener("hashchange", () => {
	const newPage = window.location.hash.substring(1);
	loadPage(newPage);
});


document.addEventListener("DOMContentLoaded", function () {
	const currentPage = window.location.hash.substring(1) || "profile";
	loadPage(currentPage);

	attachNavigationListeners();
});