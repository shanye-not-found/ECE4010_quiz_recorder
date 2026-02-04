// 初始化 Dexie 数据库
const db = new Dexie("QuizTrackerDB");
db.version(1).stores({
    counts: 'id, total, answered, correct'
});

// 获取 DOM 元素
const totalInput = document.getElementById('totalQuiz');
const answeredInput = document.getElementById('answeredQuiz');
const correctInput = document.getElementById('correctQuiz');

const responseRateDisplay = document.getElementById('responseRate');
const accuracyRateDisplay = document.getElementById('accuracyRate');

const btnCorrect = document.getElementById('btnCorrect');
const btnWrong = document.getElementById('btnWrong');
const btnSkip = document.getElementById('btnSkip');

// 当前状态变量
let state = {
    total: 0,
    answered: 0,
    correct: 0
};

// 历史记录栈（用于撤销）
let historyStack = [];

// --- 核心逻辑函数 ---

// 1. 从数据库加载数据
async function loadData() {
    try {
        const data = await db.counts.get(1);
        if (data) {
            state.total = data.total;
            state.answered = data.answered;
            state.correct = data.correct;
        } else {
            // 初始化
            await db.counts.put({ id: 1, total: 0, answered: 0, correct: 0 });
        }
        updateUI();
    } catch (error) {
        console.error("Database error:", error);
    }
}

// 2. 保存数据到数据库
async function saveData() {
    try {
        await db.counts.update(1, {
            total: state.total,
            answered: state.answered,
            correct: state.correct
        });
    } catch (error) {
        console.error("Save error:", error);
    }
}

// 3. 记录历史 (在修改状态前调用)
function recordHistory() {
    // 深拷贝当前状态并存入栈中
    historyStack.push({ ...state });
    
    // 为了节省内存，只保留最近 50 步操作
    if (historyStack.length > 50) {
        historyStack.shift();
    }
}

// 4. 撤销操作
function performUndo() {
    if (historyStack.length === 0) {
        // console.log("没有可以撤销的操作");
        // 这里可以做一个简单的视觉反馈，比如让按钮抖动一下，不过为了简洁暂不添加
        return;
    }

    // 弹栈：取出上一个状态
    const prevState = historyStack.pop();
    
    // 恢复状态
    state = prevState;
    
    // 保存并更新界面
    saveData();
    updateUI();
}

// 5. 更新界面
function updateUI() {
    totalInput.value = state.total;
    answeredInput.value = state.answered;
    correctInput.value = state.correct;

    let responseRate = 0;
    let accuracyRate = 0;

    if (state.total > 0) {
        responseRate = (state.answered / state.total) * 100;
    }

    if (state.answered > 0) {
        accuracyRate = (state.correct / state.answered) * 100;
    }

    responseRateDisplay.textContent = responseRate.toFixed(1) + '%';
    accuracyRateDisplay.textContent = accuracyRate.toFixed(1) + '%';
}

// 6. 输入验证与同步
function validateAndSyncState() {
    // 修改前先记录历史
    recordHistory();

    let t = parseInt(totalInput.value) || 0;
    let a = parseInt(answeredInput.value) || 0;
    let c = parseInt(correctInput.value) || 0;

    if (c < 0) c = 0;
    if (a < c) a = c; 
    if (t < a) t = a;

    state.total = t;
    state.answered = a;
    state.correct = c;

    saveData();
    updateUI();
}

// --- 事件监听 ---

// 按钮点击逻辑
btnCorrect.addEventListener('click', () => {
    recordHistory(); // 记录当前状态
    state.total++;
    state.answered++;
    state.correct++;
    saveData();
    updateUI();
});

btnWrong.addEventListener('click', () => {
    recordHistory(); // 记录当前状态
    state.total++;
    state.answered++;
    saveData();
    updateUI();
});

btnSkip.addEventListener('click', () => {
    recordHistory(); // 记录当前状态
    state.total++;
    saveData();
    updateUI();
});

// 手动输入监听
[totalInput, answeredInput, correctInput].forEach(input => {
    input.addEventListener('change', validateAndSyncState);
});

// 键盘撤销监听 (Ctrl+Z 或 Cmd+Z)
document.addEventListener('keydown', (event) => {
    // 检测 Ctrl (Windows) 或 Meta (Mac Command键) + Z
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault(); // 阻止浏览器默认的撤销行为（如果有）
        performUndo();
    }
});

// 页面加载
document.addEventListener('DOMContentLoaded', loadData);