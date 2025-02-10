export function set404View(container) {
    container.innerHTML = `
    <div class="error404-view">
        <div class="404-center">
            <h1>Error Code 404</h1>
            <div>It seems that you are lost, go back on track <a href="#login">here</a></div>
        </div>
    </div>
    `
}
