<?php
echo 'Stopping processes...'."\n";
$processes = $this->webos->managers()->get('Process')->getAll();
foreach($processes as $process) {
	echo 'Stopping process #'.$process->getId().'...'."\n";
	$process->stop();
}