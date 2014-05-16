<?php

error_reporting(E_ALL | E_STRICT);

if (!class_exists('PHPUnit_Framework_TestCase') ||
    version_compare(PHPUnit_Runner_Version::id(), '3.5') < 0
) {
    die('PHPUnit framework is required, at least 3.5 version');
}

if (!class_exists('PHPUnit_Framework_MockObject_MockBuilder')) {
    die('PHPUnit MockObject plugin is required, at least 1.0.8 version');
}
if (!file_exists(__DIR__.'/../vendor/autoload.php')) {
    die('Install vendors using command: composer.phar install');    
}

$loader = require_once __DIR__.'/../vendor/autoload.php';
$loader->add('FSi\\Component\\ACL', __DIR__);

