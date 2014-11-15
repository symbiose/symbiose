<?php

namespace Wrappers;

/**
 * A FTPS stream wrapper.
 * @see http://php.net/manual/en/class.streamwrapper.php
 * @author emersion <contact@emersion.fr>
 */
class FtpsStream extends FtpStream {
	protected static $protocol = 'ftps';

	protected static function conn_new($urlData) {
		$conn = ftp_ssl_connect($urlData['host'], $urlData['port']);
		if ($conn === false) {
			return false;
		}

		if (!empty($urlData['user'])) {
			if (!ftp_login($conn, $urlData['user'], $urlData['pass'])) {
				return false;
			}
		}

		// Turn passive mode on
		ftp_pasv($conn, true);

		return $conn;
	}
}