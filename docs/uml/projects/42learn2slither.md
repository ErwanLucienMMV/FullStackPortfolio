# 42Learn2Slither: UML

Reviewed source: [768a9bfe97b9](https://github.com/ErwanLucienMMV/42Learn2Slither/tree/768a9bfe97b9f92b3c708ef355a3a81c782833db).

UML of the implemented manual Snake environment. GameWindow owns SnakeGame and uses the observe function for four-ray Vision. SnakeGame.step returns facts in StepResult; reward calculation, agents, Q-learning, neural networks, training and model persistence are explicitly not implemented in the reviewed README/code and are not drawn as existing classes. The environment is display-independent and the Pygame window is optional through --play.

[Open SVG](../../../backend/src/content/diagrams/42learn2slither.svg).
Portfolio: `/fr/projets?project=42learn2slither` and `/en/projects?project=42learn2slither`.
API: `/api/diagrams/42learn2slither.svg`.

```mermaid
classDiagram
 direction TB
 class GameWindow {
 +run()
 +move()
 +restart()
 +single_step()
 +draw()
 }
 class SnakeGame {
 +size : int
 +snake : tuple
 +direction : Action
 +terminated : bool
 +reset(seed)
 +step(action) StepResult
 }
 class Action {
 <<enum>>
 UP
 LEFT
 DOWN
 RIGHT
 }
 class Event {
 <<enum>>
 MOVED
 GREEN_APPLE
 RED_APPLE
 WALL_COLLISION
 BODY_COLLISION
 ZERO_LENGTH
 BOARD_COMPLETE
 }
 class StepResult {
 <<frozen_dataclass>>
 +action : Action
 +event : Event
 +terminated : bool
 +length : int
 +steps : int
 }
 class Vision {
 <<frozen_dataclass>>
 +up : tuple
 +left : tuple
 +down : tuple
 +right : tuple
 +as_text() str
 }
 class observe {
 <<function>>
 }
 GameWindow *-- SnakeGame : game
 GameWindow ..> observe : prints observation
 observe ..> SnakeGame : reads visible rays
 observe ..> Vision : returns
 SnakeGame ..> Action : accepts moves
 SnakeGame ..> StepResult : returns
 StepResult --> Event : event
 StepResult --> Action : action
```

Inspected implementation files:

- [slither/environment.py](https://github.com/ErwanLucienMMV/42Learn2Slither/blob/768a9bfe97b9f92b3c708ef355a3a81c782833db/slither/environment.py)
- [slither/vision.py](https://github.com/ErwanLucienMMV/42Learn2Slither/blob/768a9bfe97b9f92b3c708ef355a3a81c782833db/slither/vision.py)
- [slither/display.py](https://github.com/ErwanLucienMMV/42Learn2Slither/blob/768a9bfe97b9f92b3c708ef355a3a81c782833db/slither/display.py)
- [slither/cli.py](https://github.com/ErwanLucienMMV/42Learn2Slither/blob/768a9bfe97b9f92b3c708ef355a3a81c782833db/slither/cli.py)
- [README.md](https://github.com/ErwanLucienMMV/42Learn2Slither/blob/768a9bfe97b9f92b3c708ef355a3a81c782833db/README.md)
