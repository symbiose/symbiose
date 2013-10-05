<?php
define('DEBUG', 0);

//Display errors
if (!ini_get('display_errors')) {
    ini_set('display_errors', 1);
}
error_reporting(E_ALL);

session_start(); //Start sessions

chdir(dirname(__FILE__).'/..'); //Change directory to /

//Set default locale/timezone
setlocale(LC_ALL, 'en_GB.utf8');
date_default_timezone_set('Europe/Paris');

//Define max. execution time
if(!ini_get('safe_mode')) { //Detect safe_mode, but sometimes it doesn't work well -> we use the @ operator
	@set_time_limit(30);
}

/**
 * Load a class.
 * @param  string $class The class name.
 * @return boolean       True if the class was loaded, false otherwise.
 */
function autoload($class) {
	$file = './'.str_replace('\\', '/', $class).'.class.php';
	if (file_exists($file)) {
		return require $file;
	}
}
spl_autoload_register('autoload');

/**
 * Get the current PHP version ID.
 * @param  string $version The PHP version.
 * @return int             The PHP version ID.
 */
function getPHPVersionId($version) {
	$version = explode('.', $version);
	return ($version[0] * 10000 + $version[1] * 100 + $version[2]);
}

if (!defined('PHP_VERSION_ID')) { //If the PHP version ID isn't defined, let's do it
	define('PHP_VERSION_ID', getPHPVersionId(PHP_VERSION));
}

$minPHPVersion = file_get_contents('boot/phpversion.txt'); //Minimum version number required
if (PHP_VERSION_ID < getPHPVersionId($minPHPVersion)) { //Outdated version
	trigger_error('PHP '.$minPHPVersion.' is required, current version is '.PHP_VERSION, E_USER_ERROR);
}

/**
 * Log an error.
 */
function errorLogger($errno, $errstr, $errfile, $errline) {
	$errorLogPath = __DIR__.'/../var/log/errors.log';
	$loggedErrors = E_ERROR | E_PARSE | E_DEPRECATED | E_NOTICE;
	$exitErrors = E_ERROR | E_USER_ERROR | E_PARSE;

	if (!(error_reporting() & $errno)) {
		//This error code is not included in error_reporting
		return;
	}

	if ($errno & $loggedErrors) {
		switch ($errno) {
			case E_ERROR:
			case E_USER_ERROR:
				$errnoName = 'Fatal error';
				break;
			case E_PARSE:
				$errnoName = 'Parse error';
				break;
			case E_DEPRECATED:
			case E_USER_DEPRECATED:
				$errnoName = 'Deprecated';
				break;
			case E_WARNING:
			case E_USER_WARNING:
				$errnoName = 'Warning';
				break;
			case E_NOTICE:
			case E_USER_NOTICE:
				$errnoName = 'Notice';
				break;
			default:
				$errnoName = 'Unknown error';
		}

		$logLine = date('M d G:i:s').' '.$_SERVER['SERVER_NAME'].' [#'.$errno.' '.$errnoName.'] '.$errstr.' '.$errfile.':'.$errline."\n";

		file_put_contents($errorLogPath, $logLine, FILE_APPEND);
	}

	//TODO: print warnings ?
	if ($errno & $exitErrors || (defined('DEBUG') && DEBUG == 1)) {
		throw new ErrorException($errstr, $errno, 0, $errfile, $errline); //Throw an ErrorException
	} else {
		return true; //Don't execute PHP internal error handler
	}
}
set_error_handler('errorLogger');

function fatalErrorHandler() {
	$error = error_get_last();

	if (!empty($error) && $error['type'] & (E_ERROR | E_PARSE)) {
		try {
			errorLogger($error['type'], $error['message'], $error['file'], $error['line']);
		} catch(ErrorException $e) {} //Error already displayed
	}
}

register_shutdown_function('fatalErrorHandler');