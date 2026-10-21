<?php
namespace App\Http\Controllers;
use App\Mail\OrderShipped;
use Illuminate\Support\Facades\Mail;
class OrderController extends Controller
{
    public function ship($order) { Mail::to($order->email)->send(new OrderShipped($order)); return back(); }
}
