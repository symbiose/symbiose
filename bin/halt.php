<?php
echo 'Stopping processes...'."\n";

$processManager = $this->managers()->getManagerOf('process');
$processes = $processManager->listAll();
foreach($processes as $process) {
	echo 'Stopping process #'.$process->getId().'...'."\n";
	$processManager->kill($process->getId());
}