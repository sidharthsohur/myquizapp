<script>
    let questions = [
      {
        question: "What is the capital of France?",
        options: ["London", "Paris", "Berlin", "Madrid"],
        correctIndex: 1,
        explanation: "Paris is the capital of France.",
        hint: "The city is known for its iconic Eiffel Tower.",
        difficulty: "easy",
      },
          {
        question: "Which planet is known as the Red Planet?",
        options: ["Mars", "Venus", "Mercury", "Jupiter"],
        correctIndex: 0,
      },
      {
        question: "Who painted the Mona Lisa?",
        options: [
          "Leonardo da Vinci",
          "Pablo Picasso",
          "Vincent van Gogh",
          "Michelangelo",
        ],
        correctIndex: 0,
      },
  
      {
        question: "What is the largest organ in the human body?",
        options: ["Skin", "Heart", "Liver", "Brain"],
        correctIndex: 0,
      },
      {
        question: "What is the largest continent in the world?",
        options: ["Asia", "Africa", "North America", "Europe"],
        correctIndex: 0,
      },
  
    ];
  
    let currentQuestion = 0;
    let userAnswers = new Array(questions.length).fill(null);
    let score = 0;
    let showExplanation = false;
    let showHint = false;
    let showTimer = false;
    let timer = 15;
    let intervalId = null;
    let showHighScores = false;
    let highScores = [];
    let showShareButton = false;
  
    function answerQuestion(index) {
      userAnswers[currentQuestion] = index;
      if (index === questions[currentQuestion].correctIndex) {
        score++;
      }
      currentQuestion++;
      showExplanation = false;
      showHint = false;
      if (currentQuestion < questions.length) {
        // Prepare for the next question
        clearInterval(intervalId);
        showTimer = false;
        timer = 10;
      } else {
        // Quiz completed
        showHighScores = true;
        showShareButton = true;
        // Save the user's score in the high scores list (assuming we have a user object with a name property)
        highScores.push({ name: "User", score: score });
        // Sort high scores in descending order
        highScores.sort((a, b) => b.score - a.score);
      }
    }
  
    function restartQuiz() {
      currentQuestion = 0;
      userAnswers = new Array(questions.length).fill(null);
      score = 0;
      showExplanation = false;
      showHint = false;
      showTimer = false;
      timer = 0;
      clearInterval(intervalId);
      showHighScores = false;
      showShareButton = false;
    }
  
    function startTimer() {
      showTimer = true;
      timer = 10; // Set the timer duration (in seconds) for each question
      intervalId = setInterval(() => {
        timer--;
        if (timer <= 0) {
          clearInterval(intervalId);
          answerQuestion(null); // Call this to move to the next question when time's up
        }
      }, 1000);
    }
  
    function showExplanationForCurrentQuestion() {
      showExplanation = true;
    }
  
    function showHintForCurrentQuestion() {
      showHint = true;
    }
  
    function shareResults() {
      const tweetText = `I scored ${score} out of ${questions.length} in the quiz! Try it out! #QuizApp`;
      const twitterShareURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      window.open(twitterShareURL, "_blank");
   }
    
  </script>
  
  <main>
    <h1>Welcome to my Quiz App</h1>

    <nav>
    <a href="/">Home</a>
      <a href="src/routes/simplequiz/+page.svelte">Simple Quiz</a>
      <a href="src/routes/complexquiz/+page.svelte">Complex Quiz</a>
    </nav>
    {#if currentQuestion < questions.length}
      <div class="question">
        <h2>{questions[currentQuestion].question}</h2>
        <div class="options">
          {#each questions[currentQuestion].options as option, index}
            <button
              class:selected={userAnswers[currentQuestion] === index}
              on:click={() => answerQuestion(index)}>{option}</button
            >
          {/each}
        </div>
        {#if showExplanation}
          <p>{questions[currentQuestion].explanation}</p>
        {/if}
        {#if showHint}
          <p>{questions[currentQuestion].hint}</p>
        {/if}
        {#if showTimer}
          <p>Time left: {timer} seconds</p>
        {/if}
      </div>
    {:else}
      <div class="score">
        <h2>Quiz Completed</h2>
        <p>Your Score: {score}/{questions.length}</p>
        <button on:click={restartQuiz}>Restart Quiz</button>
        {#if showHighScores}
          <h3>High Scores</h3>
          <ol>
            {#each highScores as highScore}
              <li>{highScore.name}: {highScore.score}</li>
            {/each}
          </ol>
        {/if}
        {#if showShareButton}
          <button on:click={shareResults}>Share Results</button>
        {/if}
      </div>
    {/if}
  </main>
  
    <style>
    main {
      text-align: center;
      padding: 1em;
    }
  
    h1 {
      margin-bottom: 1em;
    }
  
    .question {
      margin-bottom: 2em;
    }
  
    h2 {
      margin-bottom: 1em;
    }
  
    .options {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1em;
    }
  
    button {
      padding: 0.5em 1em;
      font-size: 1em;
      background-color: #f1f1f1;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
  
    button:hover {
      background-color: #ddd;
    }
  
    button:selected {
      background-color: #2196f3;
      color: white;
      font-weight: bold;
    }
  
    .score {
      margin-top: 2em;
    }
  
    p {
      margin-bottom: 1em;
    }
  
    button {
      color: white;
      background-color: #2196f3;
      border-radius: 4px;
      padding: 0.5em 1em;
      font-size: 1em;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
  
    button:hover {
      background-color: #0e84db;
    }
  </style>
  