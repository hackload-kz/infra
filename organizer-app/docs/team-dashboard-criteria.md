I want to add a team results dashboard
The dashboard menu must have name "Results" in russian and is placed under Tasks

The dashboard must display all the approved teams in a table, as the first column names. The team name must be a link to the team page. 

Following columns must be passing criteris:
1. Наличие кода в репозитории - да/нет (1 балл)
Проверяется наличие коммитов за последние 24 часа
2. Наличие развернутого решения - да / нет (1 балл)
Проверяем по доменному имени один из endpoint и если ответ HTTP 200 - считаем что критерий выполнен
3. Поиск событий по базе активных событий (3 балла)
- При наплыве 5000 пользователей
- При наплыве 25 000 пользователей
- При наплыве 50 000 пользователей
По каждой метрике считаем P95, Доля успешных запросов - 95%.
Длительность теста - 10 минут

Критерии прохождения:
- P95 < 2 секунд
- Успешные запросы (HTTP 200) - 95%
4. Случайная выборка по базе архивных событий (1 балл)
5000 пользователей открывают случайные архивные события в течение 10 минут
Критерии прохождения:
- P95 < 1 секунды
- Успешные запросы (HTTP 200) - 99%


5. Аутентификация пользователей (1 балл)
50 000 пользователей аутентифицируется в течение 10 минут. 

Критерии прохождения теста:
- P95 < 1 секунды
- Успешные запросы - HTTP 200 - 99%
- Длительность теста - 10 минут


6. Билет забронирован (но не выкуплен) (3 балла)

- При наплыве 25 000 пользователей
- При наплыве 50 000 пользователей
- При наплыве 100 000 пользователей

Критерии прохождения:
- P95 < 3 секунд
- Успешные запросы - HTTP 200 - 99%
- Забронированные билеты = 100 000
- Дополнительно считает, время на тест (метрика)


7. Билет забронирован и отменен (но не выкуплен) (1 балл)
- 90 тысяч пользователей бронируют билеты по порядку
- Спустя 3 минуты, 10 тысяч пользователей начинают возвращать билеты

Критерии прохождения:
- P95 < 3 секунд
- Успешные запросы - HTTP 200 - 99%
- Считаем количество забронированных билетов
- Длительность теста - 10 минут

8. Потраченные средства с момента начала хакатона.
Сумма накопительным эффектом

All the criteria must have an update date (when the criteria were last updated). If a criteria has data -it shows Red (failed) or Green dot (passed). And grey if hasn't data.

For each criteria must be shown numbers according to the criteria

The number in the database must relate to a Hackathon. Create database migrations for that.

The numbers must be updated over the API, secured by Serice-Token. Each criteria must be a unuque identifier per team, hardcoded. Keep each updated number and the history of criteria updates.
Create me a break-down task list for implementing the dashboard. To each task add required data to start implementing them itteratively. After each step the linters, type-checks and compilation must be made and fixed all the errors. 
Ask question for clarification before you proceed for each task. 