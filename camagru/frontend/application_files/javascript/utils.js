import { set404View } from "./404.js"

export function getArgFromURL(page){
    const splittedPage = page.split("/");
    if (splittedPage.length > 2 || !splittedPage[1]) {
        set404View();
        return "";
    }
    return splittedPage[1];
}