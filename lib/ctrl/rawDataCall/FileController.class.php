<?php
namespace lib\ctrl\rawDataCall;

use \Exception;
use \RuntimeException;

/**
 * Provides access to the system's files.
 */
class FileController extends \lib\RawBackController {
	public function executeIndex(\lib\HTTPRequest $request) {
		$fileManager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$authManager = $this->managers()->getManagerOf('authorization');
		$user = $this->app()->user();

		if (!$request->getExists('path')) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 400 Bad Request');
			throw new RuntimeException('No file specified');
		}

		$filePath = $fileManager->beautifyPath($request->getData('path'));

		//Request parameters
		$options = array(
			'download' => ($request->getExists('dl') && (int) $request->getData('dl')),
			'shareKey' => ($request->getExists('key')) ? $request->getData('key') : null,
			'range' => null
		);

		// Get the 'Range' header if one was sent
		// See https://stackoverflow.com/questions/157318/resumable-downloads-when-using-php-to-send-the-file/4451376#4451376
		if (isset($_SERVER['HTTP_RANGE'])) {
			$options['range'] = $_SERVER['HTTP_RANGE']; // IIS/Some Apache versions
		} else if (function_exists('apache_request_headers') && $apache = apache_request_headers()) { // Try Apache again
			$headers = array();
			foreach ($apache as $header => $val) {
				if (strtolower($header) == 'range') {
					$options['range'] = $val;
					break;
				}
			}
		}

		//Authorizations control
		$userAuths = array();

		if ($user->isLogged()) { //Get user's authorizations
			$userAuths = $authManager->getByUserId($user->id());
		}

		$sharedAccess = false;
		if (!empty($options['shareKey'])) {
			$internalPath = $fileManager->toInternalPath($filePath);
			$fileMetadatas = $metadataManager->listParents($internalPath, true);

			foreach ($fileMetadatas as $metadata) {
				$shares = $shareManager->listByFileId($metadata['id']);

				foreach ($shares as $share) {
					if ($share['type'] == 'link' && $share['key'] === $options['shareKey']) {
						$sharedAccess = true;
						break;
					}
				}

				if ($sharedAccess) {
					break;
				}
			}
		}

		if (!$sharedAccess) {
			try {
				$this->guardian->controlArgAuth('file.read', $filePath, $userAuths);
			} catch(Exception $e) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 403 Forbidden');
				throw $e;
			}
		}

		//Check if the file exists
		if (!$fileManager->exists($filePath)) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new RuntimeException('The specified file "'.$filePath.'" doesn\'t exist');
		}

		if ($fileManager->isDir($filePath) && !$options['download']) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 406 Not Acceptable');
			throw new RuntimeException('The specified file "'.$filePath.'" is a directory');
		}

		$outputFile = $filePath;
		$filename = $fileManager->basename($filePath);

		//If the file is a directory, zip it
		if ($fileManager->isDir($filePath) && $options['download']) {
			if (strpos($filePath, '/home/') !== 0) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 403 Forbidden');
				throw new RuntimeException('Downloading files which are not in your home directory is not allowed');
			}

			if (!class_exists('\ZipArchive')) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 501 Not Implemented');
				throw new RuntimeException('Downloading directories is not available on this system');
			}

			$filesInDir = $fileManager->readDir($filePath, true); //Read recursively the directory
			$tmpFilePath = $fileManager->tmpfile();
			$zip = new \ZipArchive();
			$zip->open($fileManager->toInternalPath($tmpFilePath), \ZipArchive::CREATE);

			foreach($filesInDir as $filename => $filepath) {
				if ($fileManager->isDir($filepath)) {
					$added = $zip->addEmptyDir($filename);
				} else {
					$added = $zip->addFile($fileManager->toInternalPath($filepath), $filename);
				}

				if ($added === false) {
					$this->app->httpResponse()->addHeader('HTTP/1.0 500 Internal Server Error');
					throw new RuntimeException('Unable to add "'.$filepath.'" to zip file');
				}
			}

			$zip->close();

			$outputFile = $tmpFilePath;
			$filename = $fileManager->basename($filePath) . '.zip';
		}

		// Get the data range requested (if any)
		$isPartial = false;
		$filesize = $fileManager->size($outputFile);
		$length = $filesize;
		if (!empty($options['range'])) {
			$isPartial = true;
			list($param, $range) = explode('=', $options['range']);

			if (strtolower(trim($param)) != 'bytes') { // Bad request - range unit is not 'bytes'
				$this->app->httpResponse()->addHeader('HTTP/1.0 400 Bad Request');
				throw new RuntimeException('Invalid range: only ranges in bytes are accepted');
			}

			$range = explode(',', $range);
			$range = explode('-', $range[0]); // We only deal with the first requested range

			if (count($range) != 2) { // Bad request - 'bytes' parameter is not valid
				$this->app->httpResponse()->addHeader('HTTP/1.0 400 Bad Request');
				throw new RuntimeException('Invalid range: bytes parameter is not valid');
			}

			if ($range[0] === '') { // First number missing, return last $range[1] bytes
				$end = $filesize - 1;
				$start = $end - intval($range[0]);
			} else if ($range[1] === '') { // Second number missing, return from byte $range[0] to end
				$start = intval($range[0]);
				$end = $filesize - 1;
			} else { // Both numbers present, return specific range
				$start = intval($range[0]);
				$end = intval($range[1]);
			}

			if ($end >= $filesize || (!$start && (!$end || $end == ($filesize - 1)))) { // Invalid range/whole file specified, return whole file
				$isPartial = false;
			}

			$length = $end - $start + 1;
		}

		//Send response
		$httpResponse = $this->app->httpResponse();
		$httpResponse->addHeader('Content-Type: '.$fileManager->mimetype($outputFile));

		if ($options['download']) {
			$httpResponse->addHeader('Content-Description: File Transfer');
			$httpResponse->addHeader('Content-Disposition: attachment; filename="' . $filename . '"');
			$httpResponse->addHeader('Content-Transfer-Encoding: binary');
		}

		$outputMtime = $fileManager->mtime($outputFile);
		if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $outputMtime) {
			$httpResponse->addHeader('HTTP/1.0 304 Not Modified');
			return;
		}

		$httpResponse->addHeader('Date: ' . gmdate('D, d M Y H:i:s T'));
		$httpResponse->addHeader('Last-Modified: ' . gmdate('D, d M Y H:i:s T', $outputMtime));
		$httpResponse->addHeader('Content-Length: ' . $filesize);

		$httpResponse->addHeader('Accept-Ranges: bytes');

		$resp = $this->responseContent;
		if ($isPartial) {
			$httpResponse->addHeader('HTTP/1.1 206 Partial Content');
			$httpResponse->addHeader('Content-Range: bytes '.$start.'-'.$end.'/'.$filesize);
		}

		if (!$fp = fopen($fileManager->toInternalPath($outputFile), 'r')) { // Error out if we can't read the file
			$this->app->httpResponse()->addHeader('HTTP/1.0 500 Internal Server Error');
			throw new RuntimeException('Cannot read file "'.$filePath.'"');
		}

		if ($isPartial && $start > 0) {
			fseek($fp, $start);
		}

		while ($length) { // Read in blocks of 8KB so we don't chew up memory on the server
			$read = ($length > 8192) ? 8192 : $length;
			$length -= $read;
			$resp->output(fread($fp, $read));
		}
		fclose($fp);
	}
}