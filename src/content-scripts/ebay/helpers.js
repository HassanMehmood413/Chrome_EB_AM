
const getShipping = (domain) => {
  if (domain === 'UK') {
    return `<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Shipping</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
     <ul>
        <ul>
          <li>Free &amp; Fast Delivery - We offer free delivery to most of the United Kingdom with a normal delivery time of 2-4 days. However, in very rare situations, additional delivery time (up to 3 weeks) may be required for some items.</li>
          <li>Alternative Carriers - We may use alternative carriers (e.g. Royal Mail, DPD, Evri, ParcelForce, Yodel, etc.) to ensure your package arrives safely and on time. Due to the use of multiple carriers, we are unable to provide a tracking number automatically.</li>
          <li>Handling Time - Orders are processed and shipped within 1 business days of receiving cleared payment.</li>
        </ul>
      </ul>
    </div>
    <div style="width: 18%; float: right;">
      <div id="delivery_right">
        <br>
        <img style="width: 120px; height: 120px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/free_shipping_USA.png"
          alt>
      </div>
    </div>
  </div>
</div>`;
  } else {
    return `<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Delivery</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
     <ul>
        <ul>
          <li>Free &amp; Fast Delivery - We offer free shipping to most of the United States with a normal delivery time of 2-4 days. However, in very rare situations, additional delivery time (up to 3 weeks) may be required for some items.</li>
          <li>Alternative Carriers - We may use alternative carriers (e.g. USPS, FedEx, UPS, etc.) to ensure your package arrives safely and on time. Due to the use of multiple carriers, we are unable to provide a tracking number automatically.</li>
          <li>Handling Time - Orders are processed and shipped within 1 business days of receiving cleared payment.</li>
        </ul>
      </ul>
    </div>
    <div style="width: 18%; float: right;">
      <div id="delivery_right">
        <br>
        <img style="width: 120px; height: 120px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/Free+Delivery+(UK)png.png"
          alt>
      </div>
    </div>
  </div>
</div>`;
  }
};

export const getDescription = ({
  title,
  images = [],
  features,
  benefits,
  whyChoose,
  domain
}) => {
  let newWhyChoose = whyChoose;
  if (typeof whyChoose === 'object') {
    newWhyChoose  = Object.values(whyChoose);
  }
  const featuresDiv = `<div><font face="Arial" size="6">Features:</font><ul>${features?.map(item => `<li>${item}</li>`)?.join('')}</ul></div>`;
  const benefitsDiv = `<div><font face="Arial" size="6">Benefits:</font><ul>${benefits?.map(item => `<li>${item}</li>`)?.join('')}</ul></div>`;
  const whyChooseDiv = `<div><font face="Arial" size="6">Why Choose Our Product:</font><p>${newWhyChoose?.join(' ')}</p></div>`;
  return `<div style="text-align: center;">
  <b style="font-family: Arial; font-size: x-large;">
    <br>
  </b>
</div>
<div style="text-align: center;">
  <b style="font-family: Arial;">
    <font color="#00a2ff" style size="6">
      ${title}
    </font>
  </b>
</div>
<div style="text-align: center;">
  <b style="font-family: Arial; font-size: x-large;">
    <font color="#00a2ff">
      <br>
    </font>
  </b>
</div>

<div style="text-align: center; display: flex; gap: 15px;">
  <div style="display: flex; flex-direction: column; gap: 5px; width: 50%;">
  <img src=${images[0]} width="450px" height="450px">
  </div>
  <div style="display: flex; flex-direction: column; gap: 5px; width: 50%; text-align: left;">
    <div>
      <font face="Arial" size="6">
        ${title}
      </font>
    </div>
    <br>
    ${features?.length && featuresDiv}
    ${benefits?.length && benefitsDiv}
    ${newWhyChoose?.length && whyChooseDiv}
  </div>
</div>
${getShipping(domain)}
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Return</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <ul>
        <ul>
          <li>Easy Return Process – Simply send us a message and we will send you a return label as required.</li>
          <li>14-day Money Back Guarantee – if you change your mind and can return the item unopened.</li>
          <li>30-day Money Back Guarantee – in case item becomes faulty for any reason after purchase.</li>
          <li>No restocking fee - Buyer is responsible for delivery costs of the return if nothing is wrong with the item, if item arrived damaged a claim will be made with the courier.</li>
          <li>Refund processed within 5 working days of receiving the return.</li>
        </ul>
      </ul>
    </div>
    <div style="width: 18%; float: right;">
      <div id="delivery_right">
        <img style="width: 120px; height: 120px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/easyreturns.png"
          alt>
      </div>
    </div>
  </div>
</div>
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Feedback</button>
  <div class="panel"
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <p>Your feedback means everything to us. We would really appreciate it if you would leave us a 5 Star Review upon receiving your parcel, if for any reason you don’t feel we deserve 5 Stars please reach out first so we can learn from this experience.</p>
    </div>
    <div style="width: 25%; float: right;">
      <div id="delivery_right" style="text-align: center;">
        <img style="width: 150px; height: 100px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/please+review.png"
          alt>
      </div>
    </div>
  </div>
</div>
<div>
  <button style="background-color: #d81420;
    border: medium none;
    color: #fff;
    cursor: pointer;
    font-size: 26px;
    font-weight: bold;
    outline: medium none;
    padding: 3px 21px;
    text-align: center;
    transition: all 0.4s ease 0s;
    width: 100%;">Contact Us</button>
  <div
    style="max-height: 478px;padding: 0 18px;background-color: white;overflow: hidden;transition: max-height 0.2s ease-out;">
    <div style="width: 75%; float: left;">
      <p>For any questions, please reach out, we strive to reply 7 days a week to all customer messages same day.</p>
    </div>
    <div style="width: 25%; float: right;">
      <div id="delivery_right" style="text-align: center;">
        <img style="width: 150px; height: 100px;"
          src="https://patiom.s3.us-east-1.amazonaws.com/contactus.jpg"
          alt>
      </div>
    </div>
  </div>
</div>
<div
  style="width: 100%; background-color: #fff !important;     color: #419f01 !important;     font-size: 35px !important;     font-weight: 700 !important;     padding-bottom: 20px;     padding-top: 20px;     text-align: center !important;">
  <p><span class="footerss" data-label="QjA4OTVGMUsySg==">Thank you for
      supporting our small family business!</span></p>
</div>`;
};