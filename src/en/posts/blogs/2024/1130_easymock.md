---
title: A Memo on the Basic Usage of EasyMock
author: issei-fujimoto
date: 2024-11-30T00:00:00.000Z
tags:
  - テスト
  - easymock
  - java
  - junit
image: true
translate: true

---

When working on internal development support projects, I sometimes lecture beginners in implementation. Testing is often a stumbling block for many of them. Unit testing becomes even more challenging when mock objects are involved. Since these are external libraries, they are often not covered in Java courses.

With that said, I’d like to revisit EasyMock, a library that was frequently used in past projects, and review its usage to cover the basics.

## About EasyMock

[EasyMock](https://easymock.org/) is a mock library used to create mock objects. Mock objects can simulate the behavior of specified objects, allowing you to replace classes that the test target depends on and run tests without being affected by the implementation status of those dependencies.

## Execution Environment

The following versions of JUnit and EasyMock are used:
- [JUnit](https://junit.org/junit5/): 5.10.2
- [EasyMock](https://easymock.org/): 5.4.0

## Test Target

This time, we will create a process to calculate the win rate of a specific player based on match results in a competitive game. First, let’s define the entity for match results, the `GameResult` class, as shown below. For simplicity, we won’t create entities for players and will only use their names.

The game is a two-player match, where players are either on the left or right side of the screen, like in chess where one side is the king's side and the other is the opponent's side. Players are represented as `player1` and `player2`. Even in a match between players A and B, it could be represented as either `player1:A, player2:B` or `player1:B, player2:A`.

```java:GameResult.java
public class GameResult {
    /** Match result ID */
    private Long id;
    /** Name of player 1 */
    private String player1;
    /** Name of player 2 */
    private String player2;
    /** Match result (0: draw, 1: player 1 wins, 2: player 2 wins) */
    private int result;

    // Constructor
    public GameResult(Long id, String player1, String player2, int result) {
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this.result = result;
    }

    // Getters and setters omitted
}
```

Next, we define the `GameResultDao` interface and its `findByPlayer` method, which retrieves `GameResult` data. The `findByPlayer` method takes a player's name as an argument and returns a list of `GameResult` objects. In an actual implementation, it would likely fetch `GameResult` data from a database table where the provided player matches either `player1` or `player2`.

We will then create a `GameResultRepository` class that uses this method, and in its unit test, we will simulate the behavior of `findByPlayer` using a mock object for `GameResultDao`.

```java:GameResultDao.java

import java.util.List;
import entity.GameResult;

public interface GameResultDao {
    List<GameResult> findByPlayer(String player);
}

```

The last part of the production code is the `GameResultRepository` class. We will create a `calcWinningRate` method that calculates the win rate of the given player (wins/matches played). Since the player could win as either `player1` or `player2`, we account for both cases when tallying wins. To handle division precision, we use the `BigDecimal` class.

The logic is explained in the comments, but note that `GameResultDao` is expected to be injected, so no getter is provided for it.

```java:GameResultRepository.java

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import dao.GameResultDao;
import entity.GameResult;

public class GameResultRepository {

    // Normally, this instance would be obtained via injection
    // This is the target for mocking during testing
    private GameResultDao gameResultDao;

    /**
     * Method to calculate win rate
     * 
     * @param player Player's name
     * @return Win rate as a decimal
     * @throws Exception Exception
     */
    public BigDecimal calcWinningRate(String player) throws Exception {
        // During testing, this behavior will be simulated with a mock
        List<GameResult> results = gameResultDao.findByPlayer(player);

        // Throw an exception if there are no match records for the player
        if (results.size() == 0) {
            throw new Exception();
        }

        // Count the number of wins for the given player
        int winningCount = 0;
        for (GameResult result : results) {
            String winner;
            // Determine whether player1 or player2 won based on the result value
            switch (result.getResult()) {
                case 1:
                    winner = result.getPlayer1();
                    break;
                case 2:
                    winner = result.getPlayer2();
                    break;
                default:
                    continue;
            }
            if (player.equals(winner)) {
                winningCount++;
            }
        }

        // Perform division to calculate the win rate (wins/matches played) as a decimal
        return new BigDecimal(winningCount).divide(new BigDecimal(results.size()), 4,
                RoundingMode.HALF_UP);
    }
}

```

## Test Code

Below is the test code. Comments are added to explain the parts related to EasyMock, which are further elaborated below.  
Reference: EasyMock [User Guide](https://easymock.org/user-guide.html)

```java:GameResultRepositoryTest.java

import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.mock;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.verify;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dao.GameResultDao;
import entity.GameResult;

public class GameResultRepositoryTest {

    /* Test target */
    private GameResultRepository testee;

    /* Object to be mocked */
    private GameResultDao mockGameResultDao;

    @BeforeEach
    public void setUp() throws Exception {
        testee = new GameResultRepository();

        // 1: Create a mock object
        mockGameResultDao = mock(GameResultDao.class);

        // 2: Inject the mock object
        Field field = testee.getClass().getDeclaredField("gameResultDao");
        field.setAccessible(true);
        field.set(testee, mockGameResultDao);
    }

    @Test
    public void testCalcWinningRate() throws Exception {
        /* List of match results to be returned by the DAO */
        List<GameResult> resultList = new ArrayList<>();
        resultList.add(new GameResult(1L, "Ryu", "Ken", 1));
        resultList.add(new GameResult(2L, "Guile", "Ryu", 1));
        resultList.add(new GameResult(4L, "Guile", "Ryu", 2));
        resultList.add(new GameResult(5L, "Ryu", "Ken", 2));
        resultList.add(new GameResult(6L, "Ryu", "Ken", 0));

        // 3: Define behavior
        expect(mockGameResultDao.findByPlayer("Ryu")).andReturn(resultList);

        // 4: Prepare for execution of defined behavior
        replay(mockGameResultDao);

        BigDecimal actual = testee.calcWinningRate("Ryu");
        assertEquals(new BigDecimal("0.4000"), actual);

        // 5: Verify that the behavior occurred as defined
        verify(mockGameResultDao);
    }
}
```

### 1: Create a Mock Object

```java
    // 1: Create a mock object
    mockGameResultDao = mock(GameResultDao.class);
```

In the method annotated with `@BeforeEach`, we create a mock object for `mockGameResultDao`. Using the `mock` method, we can create a mock object that simulates the specified class.

::: info
Supplementary Information on Mock Creation

The `mock` method has been available since EasyMock version 3.4. For earlier versions, use `createMock` instead:
```java
mockGameResultDao = createMock(GameResultDao.class);
```
::::

### 2: Inject the Mock Object

```java
    // 2: Inject the mock object
    Field field = testee.getClass().getDeclaredField("gameResultDao");
    field.setAccessible(true);
    field.set(testee, mockGameResultDao);
```

We need to ensure that the created mock is used in the test logic. Since the `GameResultRepository` class does not provide a getter for the `gameResultDao` variable, we use `java.lang.reflect.Field` to replace it via reflection.

### 3: Define Behavior

```java
    // 3: Define behavior
    expect(mockGameResultDao.findByPlayer("Ryu")).andReturn(resultList);
```

Define the behavior of the mock object’s method calls. After calling `replay`, the mock will behave as defined.

### 4: Prepare for Execution of Defined Behavior

```java 
    // 4: Prepare for execution of defined behavior
    replay(mockGameResultDao);
```

After defining the behavior, use the `replay` method to prepare the mock object for execution.

### 5: Verify Behavior

```java
    // 5: Verify that the behavior occurred as defined
    verify(mockGameResultDao);
```

After executing the test target method, we verify whether the mock behaved as defined.

## Capture Feature

When mocking methods that take objects as arguments, it can be difficult to check the values. The capture class allows you to verify the arguments passed to the mock.

```java
// Import for using capture
import static org.easymock.EasyMock.capture;
import org.easymock.Capture;

/* Omitted */

    @Test
    public void testCalcWinningRate() throws Exception {

        List<GameResult> resultList = new ArrayList<>();
        resultList.add(new GameResult(1L, "Ryu", "Ken", 1));
        resultList.add(new GameResult(2L, "Guile", "Ryu", 1));
        resultList.add(new GameResult(4L, "Guile", "Ryu", 2));
        resultList.add(new GameResult(5L, "Ryu", "Ken", 2));
        resultList.add(new GameResult(6L, "Ryu", "Ken", 0));

        // 1: Create a capture
        Capture<String> captured = Capture.newInstance();

        // 2: Use the capture in the behavior definition
        expect(mockGameResultDao.findByPlayer(capture(captured))).andReturn(resultList);

        replay(mockGameResultDao);

        BigDecimal actual = testee.calcWinningRate("Ryu");

        // 3: Retrieve and verify the captured value
        String capturedValue = captured.getValue();
        assertEquals("Ryu", capturedValue);

        assertEquals(new BigDecimal("0.4000"), actual);
        verify(mockGameResultDao);
    }
```

### 1: Create a Capture

Declare a `Capture` type instance and create it using `Capture.newInstance()`.

### 2: Use the Capture in the Behavior Definition

Specify the capture in the mock object’s argument using the `capture` method.

### 3: Retrieve and Verify the Captured Value

After executing the test target, retrieve the argument passed to the mock using the `getValue` method of the `Capture` instance and verify its content.

## Summary

This article summarized the basic usage of EasyMock. These basics should cover most test cases. EasyMock also offers other features, such as object creation and injection using annotations and utilities for handling multiple mocks. If you find the process cumbersome, looking into these features might simplify your work.
