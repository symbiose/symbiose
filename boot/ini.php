<?php
define('DEBUG', 0);

//Display errors
if (!ini_get('display_errors')) {
    ini_set('display_errors', 1);
}
error_reporting(E_ALL);

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
	$classPath = str_replace('\\', '/', $class).'.class.php';
	$webosFile = dirname(__FILE__).'/../'.$classPath;
	$vendorFile = dirname(__FILE__).'/../lib/vendor/'.$classPath;
	if (file_exists($webosFile)) {
		return require $webosFile;
	} else if (file_exists($vendorFile)) {
		return require $vendorFile;
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
 * Unparse a parsed URL.
 * @param  array $parsed_url The parsed URL.
 * @return string            The unparsed URL.
 * @see    http://php.net/manual/en/function.parse-url.php#106731
 */
function unparse_url($parsed_url) {
	$scheme   = isset($parsed_url['scheme']) ? $parsed_url['scheme'] . '://' : '';
	$host     = isset($parsed_url['host']) ? $parsed_url['host'] : '';
	$port     = isset($parsed_url['port']) ? ':' . $parsed_url['port'] : '';
	$user     = isset($parsed_url['user']) ? $parsed_url['user'] : '';
	$pass     = isset($parsed_url['pass']) ? ':' . $parsed_url['pass']  : '';
	$pass     = ($user || $pass) ? "$pass@" : '';
	$path     = isset($parsed_url['path']) ? $parsed_url['path'] : '';
	$query    = isset($parsed_url['query']) ? '?' . $parsed_url['query'] : '';
	$fragment = isset($parsed_url['fragment']) ? '#' . $parsed_url['fragment'] : '';
	return "$scheme$user$pass$host$port$path$query$fragment";
} 

/**
 * Write a new log line.
 * @param  string $logFilename The log filename.
 * @param  string $logData     The new line to insert. Server name & date are automatically added.
 */
function writeLog($logFilename, $logData) {
	$logPath = __DIR__.'/../var/log/'.$logFilename.'.log';

	$serverName = (isset($_SERVER['SERVER_NAME'])) ? $_SERVER['SERVER_NAME'] : 'localhost';
	$logLine = date('M d G:i:s').' '.$serverName.' '.$logData."\n";

	file_put_contents($logPath, $logLine, FILE_APPEND);
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

		writeLog('errors', '[#'.$errno.' '.$errnoName.'] '.$errstr.' '.$errfile.':'.$errline);
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

//Composer
$loader = require(dirname(__DIR__) . '/lib/vendor/autoload.php');