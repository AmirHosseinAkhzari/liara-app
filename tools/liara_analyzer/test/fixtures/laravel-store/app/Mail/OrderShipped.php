<?php
namespace App\Mail;
use Illuminate\Mail\Mailable;
class OrderShipped extends Mailable
{
    public function __construct(public $order) {}
    public function build() { return $this->subject('Your order has shipped')->view('emails.shipped'); }
}
