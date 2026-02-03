export class SocialSection {
    constructor(label, ...hiddableElements) {
        this.element = document.createElement("lol-social-roster-group");
        this.element.addEventListener("post-render", () => this.onPostRender());
        this.label = label;
        this.hiddableElements = hiddableElements;
        this.isCollapsed = false;
        this.waitRender();
        this.setupCollapseObserver();
    }
    waitRender() {
        new MutationObserver((_, observer) => {
            if (this.element.querySelector("span")) {
                const newEvent = new Event("post-render");
                this.element.dispatchEvent(newEvent);
                observer.disconnect();
            }
        }).observe(this.element, { childList: true });
    }
    onPostRender() {
        try {
            const spanElement = this.element.querySelector("span");
            if (spanElement) {
                spanElement.innerText = this.label;
            }
            const headerElement = this.element.querySelector(".group-header");
            if (headerElement) {
                headerElement.removeAttribute("graggable");
            }
        } catch (error) {
            console.error("auto-champion-select(SocialSection.onPostRender): Error in post-render:", error);
        }
    }
    setupCollapseObserver() {
        try {
            new MutationObserver(() => {
                try {
                    const arrowElement = this.element.querySelector(".arrow");
                    if (arrowElement) {
                        const isOpen = arrowElement.hasAttribute("open");
                        if (isOpen !== !this.isCollapsed) {
                            this.isCollapsed = !isOpen;
                            this.onCollapsedStateChanged();
                        }
                    }
                } catch (e) {}
            }).observe(this.element, { attributes: true, subtree: true, attributeFilter: ["open"] });
        } catch (error) {
            console.error("auto-champion-select(SocialSection.setupCollapseObserver): Error setting up observer:", error);
        }
    }
    onCollapsedStateChanged() {
        try {
            this.hiddableElements.forEach(element => {
                if (element && element.classList) {
                    if (this.isCollapsed) {
                        element.classList.add("hidden");
                    } else {
                        element.classList.remove("hidden");
                    }
                }
            });
        } catch (error) {
            console.error("auto-champion-select(SocialSection.onCollapsedStateChanged): Error updating visibility:", error);
        }
    }
}
