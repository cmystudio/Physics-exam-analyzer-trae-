// 全局变量
let knowledgePoints = [];
let currentQuestionCount = 0;
let similarQuestions = [];

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化知识点数据
    loadKnowledgePoints();
    // 加载上次的试卷设置
    loadExamSettings();
    
    // 绑定导航切换事件
    document.getElementById('uploadTabLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPanel('uploadPanel');
    });
    
    document.getElementById('annotateTabLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPanel('annotatePanel');
        loadSimilarQuestions();
    });
    
    // 绑定试卷设置表单提交事件
    document.getElementById('examSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const count = parseInt(document.getElementById('questionCount').value);
        if (count > 0) {
            currentQuestionCount = count;
            generateQuestionFields(count);
            document.getElementById('questionDetailsContainer').classList.remove('d-none');
        }
    });
    
    // 绑定题目详细信息表单提交事件
    document.getElementById('questionDetailsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveExamQuestions();
    });
    
    // 绑定上传区域点击事件
    document.getElementById('uploadArea').addEventListener('click', function() {
        document.getElementById('zipFileInput').click();
    });
    
    // 绑定文件上传事件
    document.getElementById('zipFileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                uploadZipFile(file);
            } else {
                alert('请上传.zip格式的压缩文件！');
            }
        }
    });
    
    // 绑定添加知识点按钮事件
    document.getElementById('addKnowledgePointBtn').addEventListener('click', function() {
        addNewKnowledgePoint();
    });
});

// 显示指定面板
function showPanel(panelId) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.add('d-none');
    });
    
    // 显示指定面板
    document.getElementById(panelId).classList.remove('d-none');
    
    // 更新导航激活状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (panelId === 'examSettingsPanel') {
        document.querySelector('.nav-link[href="#"]').classList.add('active');
    } else if (panelId === 'uploadPanel') {
        document.getElementById('uploadTabLink').classList.add('active');
    } else if (panelId === 'annotatePanel') {
        document.getElementById('annotateTabLink').classList.add('active');
    }
}

// 加载知识点数据
function loadKnowledgePoints() {
    // 从本地存储加载知识点
    const storedPoints = localStorage.getItem('knowledgePoints');
    if (storedPoints) {
        knowledgePoints = JSON.parse(storedPoints);
    }
}

// 保存知识点数据
function saveKnowledgePoints() {
    localStorage.setItem('knowledgePoints', JSON.stringify(knowledgePoints));
}

// 加载上次保存的试卷设置
function loadExamSettings() {
    const savedSettings = localStorage.getItem('examSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings && settings.questionCount > 0) {
                document.getElementById('questionCount').value = settings.questionCount;
                currentQuestionCount = settings.questionCount;
                generateQuestionFields(settings.questionCount);
                document.getElementById('questionDetailsContainer').classList.remove('d-none');

                // 填充题目详情 (如果题目数据也保存了)
                const savedQuestions = localStorage.getItem('examQuestions');
                if(savedQuestions){
                    const questions = JSON.parse(savedQuestions);
                    questions.forEach(q => {
                        const answerEl = document.getElementById(`answer${q.questionNumber}`);
                        const knowledgePointEl = document.getElementById(`knowledgePoint${q.questionNumber}`);
                        const difficultyEl = document.getElementById(`difficulty${q.questionNumber}`);
                        const tagsContainer = document.getElementById(`selectedKnowledgePoints${q.questionNumber}`);

                        if(answerEl) answerEl.value = q.answer;
                        if(knowledgePointEl) knowledgePointEl.value = q.knowledgePoints.join(', ');
                        if(difficultyEl) difficultyEl.value = q.difficulty;
                        // 更新知识点标签显示
                        if(tagsContainer){
                            tagsContainer.innerHTML = q.knowledgePoints.map(point => {
                                return `<span class="knowledge-point-tag">${point}</span>`;
                            }).join('');
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error loading exam settings:", e);
            // 清除可能已损坏的设置
            localStorage.removeItem('examSettings');
            localStorage.removeItem('examQuestions');
        }
    }
}

// 生成题目输入字段
function generateQuestionFields(count) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'card mb-3 question-card';
        questionDiv.innerHTML = `
            <div class="card-header bg-light">
                <h5 class="mb-0">题目 ${i}</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label for="answer${i}" class="form-label">答案</label>
                    <textarea class="form-control" id="answer${i}" rows="2" required></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">相关知识点</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="knowledgePoint${i}" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="openKnowledgePointModal(${i})">选择</button>
                    </div>
                    <div id="selectedKnowledgePoints${i}" class="mt-2"></div>
                </div>
                <div class="mb-3">
                    <label for="difficulty${i}" class="form-label">难度系数 (0-1)</label>
                    <input type="number" class="form-control" id="difficulty${i}" min="0" max="1" step="0.1" required>
                </div>
            </div>
        `;
        container.appendChild(questionDiv);
    }
}

// 打开知识点选择模态框
function openKnowledgePointModal(questionNumber) {
    // 保存当前题号到模态框
    const modal = document.getElementById('knowledgePointModal');
    modal.dataset.questionNumber = questionNumber;
    
    // 显示已有知识点
    const existingPointsContainer = document.getElementById('existingKnowledgePoints');
    existingPointsContainer.innerHTML = '';
    
    if (knowledgePoints.length > 0) {
        const pointsHtml = knowledgePoints.map(point => {
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" value="${point}" id="point${point.replace(/\s+/g, '')}"> 
                <label class="form-check-label" for="point${point.replace(/\s+/g, '')}">${point}</label>
            </div>`;
        }).join('');
        existingPointsContainer.innerHTML = pointsHtml;
    } else {
        existingPointsContainer.innerHTML = '<p class="text-muted">暂无已添加的知识点</p>';
    }
    
    // 清空新知识点输入框
    document.getElementById('newKnowledgePoint').value = '';
    
    // 显示模态框
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// 添加新知识点
function addNewKnowledgePoint() {
    const newPointInput = document.getElementById('newKnowledgePoint');
    const newPoint = newPointInput.value.trim();
    const questionNumber = document.getElementById('knowledgePointModal').dataset.questionNumber;
    
    // 获取选中的已有知识点
    const selectedPoints = [];
    document.querySelectorAll('#existingKnowledgePoints input[type="checkbox"]:checked').forEach(checkbox => {
        selectedPoints.push(checkbox.value);
    });
    
    // 如果有新知识点，添加到列表
    if (newPoint) {
        if (!knowledgePoints.includes(newPoint)) {
            knowledgePoints.push(newPoint);
            saveKnowledgePoints();
        }
        selectedPoints.push(newPoint);
    }
    
    // 更新题目的知识点
    if (selectedPoints.length > 0) {
        document.getElementById(`knowledgePoint${questionNumber}`).value = selectedPoints.join(', ');
        
        // 显示已选知识点标签
        const tagsContainer = document.getElementById(`selectedKnowledgePoints${questionNumber}`);
        tagsContainer.innerHTML = selectedPoints.map(point => {
            return `<span class="knowledge-point-tag">${point}</span>`;
        }).join('');
    }
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('knowledgePointModal'));
    modal.hide();
}

// 保存试卷题目信息
function saveExamQuestions() {
    const questions = [];
    
    for (let i = 1; i <= currentQuestionCount; i++) {
        const answer = document.getElementById(`answer${i}`).value;
        const knowledgePointsText = document.getElementById(`knowledgePoint${i}`).value;
        const difficulty = parseFloat(document.getElementById(`difficulty${i}`).value);
        
        // 验证难度系数
        if (isNaN(difficulty) || difficulty < 0 || difficulty > 1) {
            alert(`题目 ${i} 的难度系数必须在0到1之间！`);
            return;
        }
        
        questions.push({
            questionNumber: i,
            answer: answer,
            knowledgePoints: knowledgePointsText.split(', ').filter(p => p.trim() !== ''),
            difficulty: difficulty
        });
    }
    
    // 保存题目信息到本地存储
    localStorage.setItem('examQuestions', JSON.stringify(questions));
    // 保存题目数量设置
    localStorage.setItem('examSettings', JSON.stringify({ questionCount: currentQuestionCount }));

    // 显示简洁的成功提示
    showSimpleAlert('试卷信息保存成功！', 'success');
}

// 显示简化的提示信息
function showSimpleAlert(message, type = 'info') {
    // 简单使用 alert，可以替换为更美观的提示库，如 SweetAlert 或 Bootstrap Toast
    alert(message);
    // 示例：使用 Bootstrap Alert (需要在HTML中有对应的容器，例如 <div id="alertContainer"></div>)
    /*
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHtml;
        // 可选：几秒后自动消失
        setTimeout(() => {
            const alertElement = alertContainer.querySelector('.alert');
            if (alertElement) {
                const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
                if (alertInstance) {
                    alertInstance.close();
                }
            }
        }, 3000);
    }
    */
}

// 上传压缩文件
function uploadZipFile(file) {
    const progressBar = document.querySelector('#uploadProgress .progress-bar');
    const progressContainer = document.getElementById('uploadProgress');
    const successAlert = document.getElementById('uploadSuccess');
    
    // 显示进度条
    progressContainer.classList.remove('d-none');
    progressBar.style.width = '0%';
    successAlert.classList.add('d-none');
    
    // 模拟上传进度
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // 使用JSZip处理压缩文件
            JSZip.loadAsync(file).then(function(zip) {
                const imageFiles = [];
                
                // 遍历压缩包中的文件
                zip.forEach(function(relativePath, zipEntry) {
                    // 只处理图片文件
                    if (!zipEntry.dir && /\.(jpg|jpeg|png|gif)$/i.test(relativePath)) {
                        const promise = zipEntry.async('base64').then(function(content) {
                            return {
                                name: zipEntry.name,
                                content: `data:image/${getFileExtension(zipEntry.name)};base64,${content}`,
                                annotated: false
                            };
                        });
                        imageFiles.push(promise);
                    }
                });
                
                // 等待所有图片处理完成
                return Promise.all(imageFiles);
            }).then(function(extractedImages) {
                // 加载现有图片并处理文件名冲突
                const existingImages = JSON.parse(localStorage.getItem('similarQuestions') || '[]');
                const existingNames = new Set(existingImages.map(img => img.name));
                
                const newImagesToAdd = [];
                extractedImages.forEach(newImage => {
                    let finalName = newImage.name;
                    let counter = 1;
                    const baseName = finalName.substring(0, finalName.lastIndexOf('.'));
                    const extension = finalName.substring(finalName.lastIndexOf('.'));

                    // 检查文件名是否重复，如果重复则添加后缀
                    while (existingNames.has(finalName)) {
                        finalName = `${baseName}_${counter}${extension}`;
                        counter++;
                    }
                    
                    newImage.name = finalName; // 更新图片对象的文件名
                    newImagesToAdd.push(newImage);
                    existingNames.add(finalName); // 将新名称添加到集合中，以防压缩包内有重名文件
                });

                // 合并并保存
                similarQuestions = [...existingImages, ...newImagesToAdd];
                localStorage.setItem('similarQuestions', JSON.stringify(similarQuestions));
                
                // 显示成功消息
                successAlert.classList.remove('d-none');
                
                // 更新标注面板
                if (document.getElementById('annotatePanel').classList.contains('d-none') === false) {
                    loadSimilarQuestions();
                }
            }).catch(function(error) {
                console.error('处理压缩文件时出错:', error);
                alert('处理压缩文件时出错，请重试！');
            });
        }
    }, 100);
}

// 获取文件扩展名
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

// 加载类似题
function loadSimilarQuestions() {
    const container = document.getElementById('similarQuestionsContainer');
    
    // 从本地存储加载类似题
    const storedQuestions = localStorage.getItem('similarQuestions');
    if (storedQuestions) {
        similarQuestions = JSON.parse(storedQuestions);
    }
    
    // 显示类似题
    if (similarQuestions.length > 0) {
        container.innerHTML = '';
        
        similarQuestions.forEach((question, index) => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            card.innerHTML = `
                <div class="card h-100">
                    <img src="${question.content}" class="card-img-top" alt="类似题 ${index + 1}" style="max-height: 200px; object-fit: contain;">
                    <div class="card-body">
                        <h5 class="card-title">类似题 ${index + 1}</h5>
                        <div class="mb-3 ${question.annotated ? '' : 'd-none'}" id="annotationInfo${index}">
                            <p><strong>答案:</strong> ${question.answer || ''}</p>
                            <p><strong>知识点:</strong> ${question.knowledgePoints ? question.knowledgePoints.join(', ') : ''}</p>
                            <p><strong>难度:</strong> ${question.difficulty || ''}</p>
                        </div>
                        <button class="btn btn-primary w-100" onclick="annotateSimilarQuestion(${index})">
                            ${question.annotated ? '编辑标注' : '标注题目'}
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-muted">暂无类似题，请先上传类似题题库</p>
            </div>
        `;
    }
}

// 标注类似题
function annotateSimilarQuestion(index) {
    const question = similarQuestions[index];
    // 创建标注表单
    const form = document.createElement('div');
    form.innerHTML = `
        <div class="mb-3">
            <label class="form-label">答案</label>
            <textarea class="form-control" id="similarAnswer" rows="2">${question.answer || ''}</textarea>
        </div>
        <div class="mb-3">
            <label class="form-label">相关知识点</label>
            <div class="input-group mb-2">
                <select class="form-select" id="similarKnowledgePointSelect" multiple>
                    ${knowledgePoints.map(point => `<option value="${point}" ${question.knowledgePoints && question.knowledgePoints.includes(point) ? 'selected' : ''}>${point}</option>`).join('')}
                </select>
                <input type="text" class="form-control" id="newSimilarKnowledgePoint" placeholder="新增知识点">
                <button class="btn btn-outline-secondary" type="button" id="addSimilarKnowledgePointBtn">添加</button>
            </div>
            <div id="selectedSimilarKnowledgePoints" class="mt-2">
                ${question.knowledgePoints ? question.knowledgePoints.map(point => `<span class="knowledge-point-tag">${point}</span>`).join('') : ''}
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label">难度系数 (0-1)</label>
            <input type="number" class="form-control" id="similarDifficulty" min="0" max="1" step="0.1" value="${question.difficulty || ''}">
        </div>
        <div class="mb-3">
            <button type="button" class="btn btn-primary" id="saveAnnotationBtn">保存</button>
            <button type="button" class="btn btn-secondary" id="cancelAnnotationBtn">取消</button>
            <button type="button" class="btn btn-danger" id="deleteSimilarQuestionBtn">删除该类似题</button>
        </div>
    `;
    // 显示类似题图片和表单
    const container = document.getElementById(`annotationInfo${index}`);
    container.innerHTML = `
        <div class="text-center mb-3">
            <img src="${question.content}" alt="类似题" style="max-height: 200px; max-width: 100%;">
        </div>
        ${form.innerHTML}
    `;
    container.classList.remove('d-none');
    // 绑定知识点下拉选择事件，动态显示标签
    document.getElementById('similarKnowledgePointSelect').addEventListener('change', function() {
        const selected = Array.from(this.selectedOptions).map(opt => opt.value);
        const tagsContainer = document.getElementById('selectedSimilarKnowledgePoints');
        tagsContainer.innerHTML = selected.map(point => `<span class="knowledge-point-tag">${point}</span>`).join('');
    });
    // 新增知识点按钮事件
    document.getElementById('addSimilarKnowledgePointBtn').addEventListener('click', function() {
        const newPointInput = document.getElementById('newSimilarKnowledgePoint');
        const newPoint = newPointInput.value.trim();
        if (newPoint && !knowledgePoints.includes(newPoint)) {
            knowledgePoints.push(newPoint);
            localStorage.setItem('knowledgePoints', JSON.stringify(knowledgePoints));
            const select = document.getElementById('similarKnowledgePointSelect');
            const option = document.createElement('option');
            option.value = newPoint;
            option.textContent = newPoint;
            option.selected = true;
            select.appendChild(option);
            // 触发change事件刷新标签
            select.dispatchEvent(new Event('change'));
        }
        newPointInput.value = '';
    });
    // 绑定保存按钮事件
    document.getElementById('saveAnnotationBtn').addEventListener('click', function() {
        const answer = document.getElementById('similarAnswer').value;
        const select = document.getElementById('similarKnowledgePointSelect');
        const selectedPoints = Array.from(select.selectedOptions).map(opt => opt.value);
        const difficulty = parseFloat(document.getElementById('similarDifficulty').value);
        if (isNaN(difficulty) || difficulty < 0 || difficulty > 1) {
            alert('难度系数必须在0到1之间！');
            return;
        }
        similarQuestions[index].answer = answer;
        similarQuestions[index].knowledgePoints = selectedPoints;
        similarQuestions[index].difficulty = difficulty;
        similarQuestions[index].annotated = true;
        localStorage.setItem('similarQuestions', JSON.stringify(similarQuestions));
        container.innerHTML = `
            <p><strong>答案:</strong> ${answer}</p>
            <p><strong>知识点:</strong> ${selectedPoints.join(', ')}</p>
            <p><strong>难度:</strong> ${difficulty}</p>
        `;
        container.classList.remove('d-none');
        const button = container.nextElementSibling;
        if (button) button.textContent = '编辑标注';
    });
    // 绑定取消按钮事件
    document.getElementById('cancelAnnotationBtn').addEventListener('click', function() {
        container.classList.add('d-none');
    });
    // 删除类似题按钮事件
    document.getElementById('deleteSimilarQuestionBtn').addEventListener('click', function() {
        similarQuestions.splice(index, 1);
        localStorage.setItem('similarQuestions', JSON.stringify(similarQuestions));
        container.parentElement.remove();
    });
}

// 自动读取data文件夹图片并解析文件名，预填充题目信息
function autoFillQuestionsFromImages() {
    // 假设图片文件名格式为：题号_知识点_难度_答案.jpg，例如：1_牛顿定律_0.7_A.jpg
    // 读取本地data文件夹图片（需后端或本地API支持，前端仅演示逻辑）
    let imageFiles = [];
    try {
        imageFiles = JSON.parse(localStorage.getItem('imageFiles') || '[]');
    } catch (e) {
        imageFiles = [];
    }
    if (imageFiles.length === 0) return;
    currentQuestionCount = imageFiles.length;
    generateQuestionFields(currentQuestionCount);
    for (let i = 0; i < imageFiles.length; i++) {
        const fileName = imageFiles[i];
        // 文件名去除扩展名
        const name = fileName.replace(/\.[^/.]+$/, "");
        const parts = name.split('_');
        if (parts.length >= 4) {
            const [num, kp, diff, ans] = parts;
            document.getElementById(`answer${i+1}`).value = ans;
            document.getElementById(`knowledgePoint${i+1}`).value = kp;
            document.getElementById(`difficulty${i+1}`).value = diff;
            // 显示知识点标签
            const tagsContainer = document.getElementById(`selectedKnowledgePoints${i+1}`);
            tagsContainer.innerHTML = `<span class=\"knowledge-point-tag\">${kp}</span>`;
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // 初始化知识点数据
    loadKnowledgePoints();
    
    // 绑定导航切换事件
    document.getElementById('uploadTabLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPanel('uploadPanel');
    });
    
    document.getElementById('annotateTabLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPanel('annotatePanel');
        loadSimilarQuestions();
    });
    
    // 绑定试卷设置表单提交事件
    document.getElementById('examSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const count = parseInt(document.getElementById('questionCount').value);
        if (count > 0) {
            currentQuestionCount = count;
            generateQuestionFields(count);
            document.getElementById('questionDetailsContainer').classList.remove('d-none');
        }
    });
    
    // 绑定题目详细信息表单提交事件
    document.getElementById('questionDetailsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveExamQuestions();
    });
    
    // 绑定上传区域点击事件
    document.getElementById('uploadArea').addEventListener('click', function() {
        document.getElementById('zipFileInput').click();
    });
    
    // 绑定文件上传事件
    document.getElementById('zipFileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                uploadZipFile(file);
            } else {
                alert('请上传.zip格式的压缩文件！');
            }
        }
    });
    
    // 绑定添加知识点按钮事件
    document.getElementById('addKnowledgePointBtn').addEventListener('click', function() {
        addNewKnowledgePoint();
    });
});

// 显示指定面板
function showPanel(panelId) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.add('d-none');
    });
    
    // 显示指定面板
    document.getElementById(panelId).classList.remove('d-none');
    
    // 更新导航激活状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (panelId === 'examSettingsPanel') {
        document.querySelector('.nav-link[href="#"]').classList.add('active');
    } else if (panelId === 'uploadPanel') {
        document.getElementById('uploadTabLink').classList.add('active');
    } else if (panelId === 'annotatePanel') {
        document.getElementById('annotateTabLink').classList.add('active');
    }
}