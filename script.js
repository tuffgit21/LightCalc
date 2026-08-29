(function () {
    "use strict";

    const display = document.getElementById("display");
    const historyEl = document.getElementById("history");
    const buttons = document.querySelector(".buttons");
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector(".theme-icon");
    const designPreview = document.getElementById("design-preview");

    let expr = "";
    let justEvaluated = false;

    const MAX_LEN = 22;

    function render() {
        display.value = expr === "" ? "0" : expr;
    }

    function isOperator(ch) {
        return ch === "+" || ch === "-" || ch === "*" || ch === "/";
    }

    function appendValue(value) {
        if (justEvaluated) {
            if (isOperator(value) || value === "%") {
                expr = expr;
            } else if (value !== "(" && value !== ")") {
                expr = "";
            }
            justEvaluated = false;
        }

        if (value === ".") {
            const parts = expr.split(/[\+\-\*\/]/);
            const last = parts[parts.length - 1];
            if (last.includes(".")) return;
            if (last === "") value = "0.";
        }

        if (expr.length >= MAX_LEN) return;

        const last = expr.slice(-1);

        if (value === "(") {
            if (last && (/\d/.test(last) || last === ")" || last === ".")) {
                expr += "*";
            }
            expr += "(";
            render();
            return;
        }

        if (value === ")") {
            const opens = (expr.match(/\(/g) || []).length;
            const closes = (expr.match(/\)/g) || []).length;
            if (opens <= closes) return;
            if (last === "" || isOperator(last) || last === "(") return;
            expr += ")";
            render();
            return;
        }

        if (isOperator(value) && (expr === "" || isOperator(last))) {
            if (value === "-") {
                if (expr === "" || isOperator(last)) {
                    expr += value;
                }
                return;
            }
            if (expr === "") return;
            expr = expr.slice(0, -1) + value;
            render();
            return;
        }

        if (expr === "0" && !isOperator(value) && value !== ".") {
            expr = value;
        } else {
            expr += value;
        }
        render();
    }

    function applyPercent() {
        const match = expr.match(/(\d*\.?\d+)%?$/);
        if (!match) return;
        const num = parseFloat(match[1]);
        const start = expr.slice(0, match.index);
        const prevOpMatch = start.match(/([\+\-\*\/])([+\-]?\d*\.?\d+)$/);
        let result;
        if (prevOpMatch) {
            const op = prevOpMatch[1];
            const prevNum = parseFloat(prevOpMatch[2]);
            if (op === "*" || op === "/") {
                result = num / 100;
            } else {
                result = prevNum * (num / 100);
            }
            const opIndex = start.lastIndexOf(prevOpMatch[0]);
            expr = start.slice(0, opIndex + 1) + result;
        } else {
            result = num / 100;
            expr = start + result;
        }
        justEvaluated = false;
        render();
    }

    function clearAll() {
        expr = "";
        historyEl.textContent = "";
        justEvaluated = false;
        render();
    }

    function deleteLast() {
        if (justEvaluated) { clearAll(); return; }
        expr = expr.slice(0, -1);
        render();
    }

    function evaluate() {
        if (expr === "") return;
        let working = expr;
        if (isOperator(working.slice(-1))) working = working.slice(0, -1);

        if (!/^[0-9+\-*/.%()\s]+$/.test(working)) {
            historyEl.textContent = "Invalid input";
            return;
        }

        if ((working.match(/\(/g) || []).length !== (working.match(/\)/g) || []).length) {
            working += ")".repeat((working.match(/\(/g) || []).length - (working.match(/\)/g) || []).length);
        }

        let computed;
        try {
            computed = Function('"use strict"; return (' + working + ')')();
        } catch (e) {
            historyEl.textContent = "Error";
            return;
        }

        if (!isFinite(computed)) {
            historyEl.textContent = expr + " =";
            display.value = computed === Infinity || computed === -Infinity ? "∞" : "Error";
            expr = "";
            justEvaluated = true;
            return;
        }

        let resultStr = String(Math.round(computed * 1e10) / 1e10);
        if (resultStr.length > MAX_LEN) {
            resultStr = computed.toExponential(8).replace(/\.?0+e/, "e");
        }

        historyEl.textContent = working + " =";
        expr = resultStr;
        justEvaluated = true;
        render();
    }

    function appendParen() {
        const opens = (expr.match(/\(/g) || []).length;
        const closes = (expr.match(/\)/g) || []).length;
        const last = expr.slice(-1);
        if (opens > closes && last !== "" && !isOperator(last) && last !== "(" && last !== ".") {
            appendValue(")");
        } else {
            appendValue("(");
        }
    }

    function handleAction(action) {
        switch (action) {
            case "clear": clearAll(); break;
            case "delete": deleteLast(); break;
            case "paren": appendParen(); break;
            case "calculate": evaluate(); break;
        }
    }

    function flash(btn) {
        if (!btn) return;
        btn.classList.remove("flash");
        void btn.offsetWidth;
        btn.classList.add("flash");
    }

    buttons.addEventListener("click", function (e) {
        const btn = e.target.closest("button");
        if (!btn) return;
        flash(btn);
        if (btn.dataset.action) {
            handleAction(btn.dataset.action);
        } else if (btn.dataset.value !== undefined) {
            const val = btn.dataset.value;
            if (val === "%") applyPercent();
            else appendValue(val);
        }
    });

    document.addEventListener("keydown", function (e) {
        const key = e.key;
        if (key >= "0" && key <= "9") { appendValue(key); flashByValue(key); }
        else if (key === ".") { appendValue("."); flashByValue("."); }
        else if (key === "+" || key === "-" || key === "*" || key === "/") {
            appendValue(key); flashByValue(key);
        }
        else if (key === "%") { applyPercent(); flashByValue("%"); }
        else if (key === "(" || key === ")") { appendParen(); flashByAction("paren"); }
        else if (key === "Enter" || key === "=") { e.preventDefault(); evaluate(); flashByAction("calculate"); }
        else if (key === "Backspace") { deleteLast(); flashByAction("delete"); }
        else if (key === "Escape") { clearAll(); flashByAction("clear"); }
    });

    function flashByValue(val) {
        const symbolMap = { "*": "×", "/": "÷", "-": "−", "+": "+" };
        const label = symbolMap[val] || val;
        flash([...buttons.querySelectorAll("button")].find(b => b.dataset.value === val || b.textContent.trim() === label));
    }
    function flashByAction(action) {
        flash([...buttons.querySelectorAll("button")].find(b => b.dataset.action === action));
    }

    function setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        themeIcon.textContent = isDark ? "🌙" : "☀️";
        themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        try { localStorage.setItem("lightcalc-theme", theme); } catch (e) {}
    }

    themeToggle.addEventListener("click", function () {
        const current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "dark" ? "light" : "dark");
    });

    let saved = "dark";
    try { saved = localStorage.getItem("lightcalc-theme") || "dark"; } catch (e) {}
    setTheme(saved);

    render();
})();
