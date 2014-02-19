<?php
namespace lib\manager;

use \lib\entities\Email;
use \RuntimeException;

class EmailManager extends \lib\Manager {
	public function send(Email $email) {
		$result = mail($email['to'], $email['subject'], $email['message'], $email['headers']);

		if (!$result) {
			throw new RuntimeException('Cannot send e-mail : server error', 501);
		}
	}
}