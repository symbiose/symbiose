<?php
$params = $this->cmd->params();
$text = implode(' ', $params);

echo htmlspecialchars($text);