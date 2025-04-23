// 全局变量
let examQuestions = [];
let errorQuestions = [];
let knowledgePointStats = {};
let similarQuestions = [];

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载试卷题目
    loadExamQuestions();
    
    // 绑定错题表单提交事件
    document.getElementById('errorQuestionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitErrorQuestions();
    });
    
    // 绑定PDF下载按钮事件
    document.getElementById('downloadPdfBtn').addEventListener('click', function(e) {
        e.preventDefault();
        generateAndDownloadPdf();
    });
});

// 加载试卷题目
function loadExamQuestions() {
    // 从本地存储加载试卷题目
    const storedQuestions = localStorage.getItem('examQuestions');
    if (storedQuestions) {
        examQuestions = JSON.parse(storedQuestions);
        displayQuestionList();
    } else {
        // 如果没有试卷题目，显示提示信息
        const container = document.getElementById('questionListContainer');
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                暂无试卷题目，请先在教师页面设置试卷信息
            </div>
        `;
    }
}

// 显示题目列表
function displayQuestionList() {
    const container = document.getElementById('questionListContainer');
    container.innerHTML = '';
    
    if (examQuestions.length > 0) {
        examQuestions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'form-check mb-2';
            questionDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${question.questionNumber}" id="question${question.questionNumber}">
                <label class="form-check-label" for="question${question.questionNumber}">
                    第 ${question.questionNumber} 题
                </label>
            `;
            container.appendChild(questionDiv);
        });
    } else {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                暂无试卷题目，请先在教师页面设置试卷信息
            </div>
        `;
    }
}

// 提交错题
function submitErrorQuestions() {
    // 获取选中的错题
    const checkedQuestions = document.querySelectorAll('#questionListContainer input[type="checkbox"]:checked');
    
    if (checkedQuestions.length === 0) {
        alert('请至少选择一道错题！');
        return;
    }
    
    // 收集错题信息
    errorQuestions = [];
    checkedQuestions.forEach(checkbox => {
        const questionNumber = parseInt(checkbox.value);
        const question = examQuestions.find(q => q.questionNumber === questionNumber);
        if (question) {
            errorQuestions.push(question);
        }
    });
    
    // 分析错题
    analyzeErrorQuestions();
    
    // 显示分析结果
    document.getElementById('initialPrompt').classList.add('d-none');
    document.getElementById('analysisResultContainer').classList.remove('d-none');
}

// 分析错题
function analyzeErrorQuestions() {
    // 统计知识点
    knowledgePointStats = {};
    
    errorQuestions.forEach(question => {
        question.knowledgePoints.forEach(point => {
            if (knowledgePointStats[point]) {
                knowledgePointStats[point].count++;
                knowledgePointStats[point].questions.push(question);
            } else {
                knowledgePointStats[point] = {
                    count: 1,
                    questions: [question]
                };
            }
        });
    });
    
    // 计算错误率
    Object.keys(knowledgePointStats).forEach(point => {
        // 找出包含该知识点的所有题目
        const totalQuestions = examQuestions.filter(q => q.knowledgePoints.includes(point)).length;
        knowledgePointStats[point].errorRate = totalQuestions > 0 ? knowledgePointStats[point].count / totalQuestions : 0;
    });
    
    // 绘制知识点统计图
    drawKnowledgePointChart();
    
    // 生成复习建议
    generateRecommendations();
    
    // 加载类似题
    loadSimilarQuestions();
}

// 绘制知识点统计图
function drawKnowledgePointChart() {
    const ctx = document.getElementById('knowledgePointChart').getContext('2d');
    
    // 按错误次数排序
    const sortedPoints = Object.keys(knowledgePointStats).sort((a, b) => {
        return knowledgePointStats[b].count - knowledgePointStats[a].count;
    });
    
    // 取前10个知识点
    const topPoints = sortedPoints.slice(0, 10);
    const counts = topPoints.map(point => knowledgePointStats[point].count);
    const errorRates = topPoints.map(point => (knowledgePointStats[point].errorRate * 100).toFixed(1));
    
    // 创建图表
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPoints,
            datasets: [
                {
                    label: '错题数量',
                    data: counts,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: '错误率 (%)',
                    data: errorRates,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '错题数量'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '错误率 (%)'
                    },
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 生成复习建议
function generateRecommendations() {
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    recommendationsContainer.innerHTML = '';

    // 按错误次数排序知识点
    const sortedPoints = Object.keys(knowledgePointStats).sort((a, b) => {
        return knowledgePointStats[b].count - knowledgePointStats[a].count;
    });

    if (sortedPoints.length === 0) {
        recommendationsContainer.innerHTML = '<p class="text-muted">暂无错题，无需特别建议。</p>';
        return;
    }

    let recommendationsHtml = '<ul class="list-group list-group-flush">';

    sortedPoints.forEach(point => {
        const stats = knowledgePointStats[point];
        const errorCount = stats.count;
        const errorRate = (stats.errorRate * 100).toFixed(1);
        const avgDifficulty = stats.questions.reduce((sum, q) => sum + parseFloat(q.difficulty || 0), 0) / errorCount;

        let suggestion = '';

        // 基础建议
        suggestion += `<li><strong>${point}</strong> (错误 ${errorCount} 次, 错误率 ${errorRate}%, 平均难度 ${avgDifficulty.toFixed(2)}): `;

        // 根据错误数量和难度给出不同建议 (初二学生，中考导向)
        if (errorCount >= 3 || (errorCount >= 2 && errorRate > 50)) {
            suggestion += '<span class="text-danger"><strong>重点关注!</strong></span> ';
            if (avgDifficulty > 0.7) {
                suggestion += '该知识点下的难题掌握不牢，建议<strong>回顾基础概念</strong>，并尝试<strong>分解难题</strong>，从简单变式入手，逐步攻克。多做相关中等难度题巩固。';
            } else if (avgDifficulty < 0.4) {
                suggestion += '基础概念可能存在混淆，建议<strong>重学基础知识</strong>，对照课本和笔记，确保理解透彻。完成课后基础练习。';
            } else {
                suggestion += '掌握程度不稳定，建议<strong>系统复习</strong>该知识点，梳理知识体系，并通过不同类型的题目（选择、填空、计算/简答）进行练习，注意总结解题方法和易错点。';
            }
        } else if (errorCount >= 1) {
            suggestion += '<span class="text-warning"><strong>需要注意!</strong></span> ';
            if (avgDifficulty > 0.6) {
                suggestion += '难题处理能力有待提高，建议<strong>查阅难题解析</strong>，学习解题思路，并尝试独立完成类似题目。';
            } else {
                suggestion += '可能存在个别概念不清或计算失误，建议<strong>回顾错题</strong>，找出具体原因，针对性地做少量练习进行巩固。';
            }
        }

        // 启发性建议 (通用)
        suggestion += ' 尝试将该知识点与其他相关知识点联系起来，构建知识网络。思考该知识点在中考中可能出现的题型。';

        suggestion += '</li>';
        recommendationsHtml += suggestion;
    });

    recommendationsHtml += '</ul>';
    recommendationsContainer.innerHTML = recommendationsHtml;
}

// 加载类似题
function loadSimilarQuestions() {
    // 从本地存储加载类似题
    const storedQuestions = localStorage.getItem('similarQuestions');
    if (storedQuestions) {
        similarQuestions = JSON.parse(storedQuestions);
        
        // 确保所有类似题都有正确的图片URL
        similarQuestions.forEach(question => {
            // 如果没有imageUrl但有content字段(可能是base64图片)，则设置imageUrl
            if (!question.imageUrl && question.content && question.content.startsWith('data:image')) {
                question.imageUrl = question.content;
            }
            
            // 记录日志，便于调试
            console.log('加载类似题:', question.description, '图片URL:', question.imageUrl ? '有' : '无');
        });
    } else {
        console.warn('未找到类似题数据');
    }
}

// 生成并下载PDF - 简化版本，使用html2canvas将整个报告转换为图片
async function generateAndDownloadPdf() {
    try {
        // 1. 创建一个临时的报告容器
        const reportContainer = document.createElement('div');
        reportContainer.className = 'pdf-report-container';
        reportContainer.style.width = '800px'; // 设置固定宽度以便于PDF生成
        reportContainer.style.padding = '20px';
        reportContainer.style.backgroundColor = 'white';
        reportContainer.style.fontFamily = 'SimSun, sans-serif'; // 确保中文字体
        
        // 2. 添加报告标题
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<h1 style="text-align: center; margin-bottom: 20px;">物理错题分析报告</h1>';
        reportContainer.appendChild(titleDiv);
        
        // 3. 添加错题列表
        if (errorQuestions.length > 0) {
            const errorListDiv = document.createElement('div');
            errorListDiv.innerHTML = '<h2>错题列表</h2>';
            
            const errorListUl = document.createElement('ul');
            errorListUl.style.paddingLeft = '20px';
            
            errorQuestions.forEach((q, index) => {
                const li = document.createElement('li');
                li.textContent = `第 ${q.questionNumber} 题 (知识点: ${q.knowledgePoints.join(', ')}; 难度: ${q.difficulty})`;
                errorListUl.appendChild(li);
            });
            
            errorListDiv.appendChild(errorListUl);
            reportContainer.appendChild(errorListDiv);
        }
        
        // 4. 添加知识点统计图表
        const chartDiv = document.createElement('div');
        chartDiv.innerHTML = '<h2>知识点错误统计</h2>';
        
        // 克隆原始图表并添加到报告中
        const originalChart = document.getElementById('knowledgePointChart');
        if (originalChart) {
            const chartContainer = document.createElement('div');
            chartContainer.style.height = '300px';
            chartContainer.style.marginBottom = '20px';
            
            // 使用toDataURL获取图表的图像
            try {
                const chartImg = document.createElement('img');
                chartImg.src = originalChart.toDataURL('image/png');
                chartImg.style.width = '100%';
                chartImg.style.maxHeight = '280px';
                chartContainer.appendChild(chartImg);
            } catch (chartError) {
                console.error('图表转换失败:', chartError);
                chartContainer.innerHTML = '<p style="color: red;">图表生成失败</p>';
            }
            
            chartDiv.appendChild(chartContainer);
        } else {
            chartDiv.innerHTML += '<p style="color: orange;">无法找到图表元素</p>';
        }
        
        reportContainer.appendChild(chartDiv);
        
        // 5. 添加复习建议
        const recommendationsDiv = document.createElement('div');
        recommendationsDiv.innerHTML = '<h2>复习建议</h2>';
        
        const originalRecommendations = document.getElementById('recommendationsContainer');
        if (originalRecommendations && originalRecommendations.hasChildNodes()) {
            // 克隆复习建议内容
            const recommendationsClone = originalRecommendations.cloneNode(true);
            recommendationsDiv.appendChild(recommendationsClone);
        } else {
            recommendationsDiv.innerHTML += '<p>暂无复习建议</p>';
        }
        
        reportContainer.appendChild(recommendationsDiv);
        
        // 6. 添加类似题推荐
        const similarQuestionsDiv = document.createElement('div');
        similarQuestionsDiv.innerHTML = '<h2>类似题推荐</h2>';
        
        // 获取需要推荐的知识点和类似题
        const topPoints = getTopKnowledgePoints(5);
        const selectedSimQuestions = selectSimilarQuestions(topPoints, 3);
        
        if (selectedSimQuestions && selectedSimQuestions.length > 0) {
            const simQuestionsContainer = document.createElement('div');
            
            for (let i = 0; i < selectedSimQuestions.length; i++) {
                const question = selectedSimQuestions[i];
                const questionDiv = document.createElement('div');
                questionDiv.style.marginBottom = '15px';
                
                const questionTitle = document.createElement('h3');
                questionTitle.textContent = question.description || `类似题 ${i + 1}`;
                questionDiv.appendChild(questionTitle);
                
                // 如果有图片URL，添加图片
                if (question.imageUrl) {
                    const img = document.createElement('img');
                    img.src = question.imageUrl;
                    img.crossOrigin = 'anonymous'; // 允许跨域加载图片
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.border = '1px solid #ddd';
                    img.style.borderRadius = '4px';
                    img.style.padding = '5px';
                    img.onerror = function() {
                        console.error('图片加载失败:', question.imageUrl);
                        const noImg = document.createElement('p');
                        noImg.textContent = '图片加载失败';
                        noImg.style.color = '#f00';
                        this.parentNode.replaceChild(noImg, this);
                    };
                    questionDiv.appendChild(img);
                } else {
                    const noImg = document.createElement('p');
                    noImg.textContent = '无图片';
                    noImg.style.color = '#888';
                    questionDiv.appendChild(noImg);
                }
                
                simQuestionsContainer.appendChild(questionDiv);
            }
            
            similarQuestionsDiv.appendChild(simQuestionsContainer);
        } else {
            similarQuestionsDiv.innerHTML += '<p>暂无匹配的类似题推荐</p>';
        }
        
        reportContainer.appendChild(similarQuestionsDiv);
        
        // 7. 将报告容器添加到文档中（临时的，稍后会移除）
        document.body.appendChild(reportContainer);
        
        // 8. 使用html2canvas将整个报告转换为图片
        // 等待所有图片加载完成
        const imgElements = reportContainer.querySelectorAll('img');
        await Promise.all(Array.from(imgElements).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => {
                    console.error('图片加载失败:', img.src);
                    resolve(); // 即使图片加载失败也继续处理
                };
            });
        }));
        
        const canvas = await html2canvas(reportContainer, {
            scale: 2, // 提高分辨率
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            imageTimeout: 5000 // 增加图片加载超时时间
        });
        
        // 9. 从文档中移除临时报告容器
        document.body.removeChild(reportContainer);
        
        // 10. 创建PDF并添加图片
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // 计算PDF尺寸（A4纸张）
        const imgWidth = 210; // A4宽度，单位mm
        const pageHeight = 297; // A4高度，单位mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        // 创建PDF实例
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // 分页处理
        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;
        
        // 添加第一页
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // 如果内容超过一页，添加更多页面
        while (heightLeft > 0) {
            position = -pageHeight * page;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            page++;
        }
        
        // 保存PDF
        pdf.save('物理错题分析报告.pdf');
        alert('PDF报告已生成并开始下载！');
        
    } catch (error) {
        console.error('生成PDF时发生错误:', error);
        console.error('错误详情:', error.message, error.stack);
        alert('生成PDF报告时出错，请查看控制台了解详情。错误信息：' + error.message);
    }
}

// 获取错题中出现最多的知识点
function getTopKnowledgePoints(count) {
    // 按出现次数排序
    const sortedPoints = Object.keys(knowledgePointStats).sort((a, b) => {
        return knowledgePointStats[b].count - knowledgePointStats[a].count;
    });
    
    // 取前N个知识点
    return sortedPoints.slice(0, count);
}

// 根据知识点筛选类似题
function selectSimilarQuestions(knowledgePoints, count) {
    // 筛选已标注的类似题
    const annotatedQuestions = similarQuestions.filter(q => q.annotated && q.knowledgePoints && q.knowledgePoints.length > 0);
    
    if (annotatedQuestions.length === 0) return [];
    
    // 计算每道题与知识点的匹配度
    const scoredQuestions = annotatedQuestions.map(question => {
        let matchScore = 0;
        
        // 计算知识点匹配分数
        question.knowledgePoints.forEach(point => {
            if (knowledgePoints.includes(point)) {
                // 根据知识点在列表中的位置给予不同权重
                const pointIndex = knowledgePoints.indexOf(point);
                matchScore += (knowledgePoints.length - pointIndex) / knowledgePoints.length;
            }
        });
        
        return {
            question: question,
            score: matchScore
        };
    });
    
    // 按匹配度排序
    scoredQuestions.sort((a, b) => b.score - a.score);
    
    // 取前N道题，如果匹配题目不足，则补充随机题目
    let selectedQuestions = scoredQuestions.filter(item => item.score > 0).map(item => item.question);
    
    // 如果匹配的题目不足，随机补充
    if (selectedQuestions.length < count) {
        const remainingQuestions = annotatedQuestions.filter(q => !selectedQuestions.includes(q));
        const shuffled = remainingQuestions.sort(() => 0.5 - Math.random());
        selectedQuestions = [...selectedQuestions, ...shuffled.slice(0, count - selectedQuestions.length)];
    } else if (selectedQuestions.length > count) {
        // 如果超过需要的数量，只取前N个
        selectedQuestions = selectedQuestions.slice(0, count);
    }
    
    return selectedQuestions;
}