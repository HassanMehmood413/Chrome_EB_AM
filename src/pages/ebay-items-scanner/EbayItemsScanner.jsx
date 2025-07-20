import moment from 'moment';
import {
  useEffect,
  useState
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Typography,
  Button,
  Col,
  InputNumber,
  Card,
  Image,
  message,
  notification
} from 'antd';
import { BsPersonCircle } from 'react-icons/bs';
import { FcStatistics } from 'react-icons/fc';
import { IoMdCopy } from 'react-icons/io';
import { IoIosSave } from 'react-icons/io';
import { isEmpty } from 'lodash';

import {
  getLocal,
  setLocal
} from '../../services/dbService';

import './style.css';

const { Title, Text } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    background: '#f6f6f6'
  },
  header: {
    marginTop: '1px'
  },
  filterBox: {
    gap: '10px',
    flexDirection: 'column',
    width: '900px',
    background: 'white',
    padding: '15px',
    borderRadius: '5px',
    boxShadow: '0 0 5px rgba(0,0,0,0.1)'
  },
  filterGroup: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  productsBox: {
    gap: '5px',
    flexDirection: 'column',
    width: '900px',
    background: '#f6f6f6'
  },
  actionButton: {
    fontSize: '10px',
    cursor: 'pointer'
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    overflow: 'scroll'
  },
  listingButtons: {
    marginTop: '5px',
    gap: '5px'
  },
  soldHistoryStyling: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid grey'
  }
});

const EbayItemsScanner = () => {
  const classes = useStyles();

  const [allEbayHuntedProducts, setAllEbayHuntedProducts] = useState([]);
  const [minimumSold, setMinimumSold] = useState(0);
  const [itemSoldWithin, setItemSoldWithin] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [soldHistoryData, setSoldHistoryData] = useState([{ key: '1', days: 1, totalSold: 0 },
    { key: '2', days: 3, totalSold: 0 },
    { key: '3', days: 7, totalSold: 0 },
    { key: '4', days: 14, totalSold: 0 },
    { key: '5', days: 30, totalSold: 0 },
    { key: '6', days: 60, totalSold: 0 },
    { key: '7', days: 90, totalSold: 0 }]);

  const amazon = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQV5wT5R7vumVlrrcVIzxKqoqNYtNmpJqwMIQ&s';
  const ebay = 'https://static.vecteezy.com/system/resources/previews/020/336/172/non_2x/ebay-logo-ebay-icon-free-free-vector.jpg';
  const teraPeak = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4mJgVrZkAzQiX_ujPnn23JaYq23YFNqCj-w&s';
  const googleLens = 'https://www.techjuice.pk/wp-content/uploads/2021/03/unnamed-1.png';
  const sold = 'https://uxwing.com/wp-content/themes/uxwing/download/e-commerce-currency-shopping/sold-icon.png';

  const IconWithTooltip = ({ element, tooltip }) => (
    <div className='icon-container'>
      {element}
      <span className='tooltip'>{tooltip}</span>
    </div>
  );

  const copyToClip = (dataToBeCopied) => {
    navigator.clipboard.writeText(JSON.stringify(dataToBeCopied));
    message.success('Text Copied');
  };

  const saveEbaySeller = async (storeName) => {
    let ebaySellers = await getLocal('competitor-search-seller-names-persisted') || [];
    ebaySellers = [...ebaySellers, storeName];
    ebaySellers = [...new Set(ebaySellers)];

    await setLocal('competitor-search-seller-names-persisted', ebaySellers);

    message.success('Ebay Seller Saved');
  };

  const handleTerapeakSearch = async (title) => {
    const messages = [{
      role: 'user',
      content: `${title}/n Describe the item with 3 KEY WORDS that shoppers would search for. And pick the best one.`
    }];

    let response = await chrome.runtime.sendMessage({
      payload: {
        model: 'gpt-4o-mini',
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response_title',
            schema: {
              type: 'object',
              properties: {
                titles: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: [
                'titles'
              ]
            }
          }
        }
      },
      callback: 'chat-gpt'
    });

    if (response?.success === false) {
      notification.error({
        message: 'Open AI API Error',
        description: response.error
      });
      return;
    }

    response = JSON.parse(response.content);

    const { titles } = response;

    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }

    const terapeakLink = `${ebayLink}/sh/research?keywords=${titles[1]}&dayRange=30&categoryId=0&offset=0&limit=50&sorting=-itemssold&tabName=SOLD&marketplace=EBAY-US&tz=America/Toronto&minPrice=0`;
    window.open(terapeakLink, '_blank');
  };

  const handleApplyFilters = async () => {
    const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
    let filteredProducts = ebayHuntedProducts;

    if (!isFilterApplied) {
      if (minimumSold > 0) {
        filteredProducts = allEbayHuntedProducts.filter(item => item.totalSold >= minimumSold);
      }

      if (itemSoldWithin > 0) {
        const startDate = moment().subtract(itemSoldWithin, 'days').toDate();
        const endDate = moment().toDate();

        filteredProducts = filteredProducts.filter(product => {
          const productDate = new Date(product.soldAt); // Convert string to Date
          return productDate >= startDate && productDate <= endDate;
        });
      }

      if (minPrice > 0) {
        const regex = /[\d.]+/; // Matches digits and the decimal point
        filteredProducts = filteredProducts.filter((obj) => {
          let price = obj.price.match(regex);
          price = price ? parseFloat(price) : 0;
          if (price >= minPrice) return obj;
        });
      }

      if (maxPrice > 0) {
        const regex = /[\d.]+/; // Matches digits and the decimal point
        filteredProducts = filteredProducts.filter((obj) => {
          let price = obj.price.match(regex);
          price = price ? parseFloat(price) : 0;
          if (price <= maxPrice) return obj;
        });
      }
    }

    if (!filteredProducts.length) {
      notification.warning({
        message: 'Ebay Items Scanner',
        description: 'No matching results.'
      });
    }

    for (let i = 0; i < filteredProducts.length; i += 1) {
      const { soldHistory  = {} } = filteredProducts[i] || {};
      if (!isEmpty(soldHistory)) {
        const data = [];
        for (const [key, value] of Object.entries(soldHistory)) {
          data.push({
            key,
            days: key,
            totalSold: value
          });
        }

        filteredProducts[i]['updatedSoldHistory'] = data;
      }
    }
    setAllEbayHuntedProducts(filteredProducts);
    setIsFilterApplied(!isFilterApplied);
  };

  const handleClearItems = async () => {
    await setLocal(`ebay-hunted-products-${currentUserId}`, []);
    setAllEbayHuntedProducts([]);
    setIsFilterApplied(false);
  };

  const handleExportTitlesToClipboard = () => {
    let allTitles = allEbayHuntedProducts.map(item => item.title);
    allTitles = allTitles.join('\n');

    navigator.clipboard.writeText(allTitles);
    message.success('Text Copied');
  };

  const handleOpenNewTab = async (platform, link) => {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    let amazonLink = 'https://www.amazon.com';

    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
      amazonLink = 'https://www.amazon.co.uk';
    }

    let openTabLink = ebayLink;
    if (platform === 'amazon') {
      openTabLink = amazonLink;
    }

    window.open(`${openTabLink}${link}`, '_blank');
  };

  useEffect(() => {
    const checkData = async () => {
      const userId = await getLocal('current-user');
      const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${userId}`);
      for (let i = 0; i < ebayHuntedProducts.length; i += 1) {
        const { soldHistory  = {} } = ebayHuntedProducts[i] || {};
        if (!isEmpty(soldHistory)) {
          const data = [];
          for (const [key, value] of Object.entries(soldHistory)) {
            data.push({
              key,
              days: key,
              totalSold: value
            });
          }

          ebayHuntedProducts[i]['updatedSoldHistory'] = data;
        }
      }

      setCurrentUserId(userId);
      setAllEbayHuntedProducts(ebayHuntedProducts || []);
    };

    checkData();
  }, []);

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>Ebay Items Scanner</Title>
      </Row>
      <Row className={classes.filterBox}>
        <Row className={classes.filterGroup}>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Minimum Sold Quantity
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter minimum total sold'
              min={0}
              onChange={(value) => setMinimumSold(value)}
              value={minimumSold}
            />
          </Row>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Min Price
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter Min Price'
              min={0}
              onChange={(value) => setMinPrice(value)}
              value={minPrice}
            />
          </Row>
        </Row>
        <Row className={classes.filterGroup}>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Sold Within (Days)
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter no of days the item was sold'
              min={0}
              onChange={(value) => setItemSoldWithin(value)}
              value={itemSoldWithin}
            />
          </Row>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Max Price
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter Max Price'
              min={0}
              onChange={(value) => setMaxPrice(value)}
              value={maxPrice}
            />
          </Row>
        </Row>
        <Row className={classes.listingButtons}>
          <Button
            type='primary'
            onClick={() => handleApplyFilters()}
          >
            {!isFilterApplied ? 'Apply Filters' : 'Cancel Filters'}
          </Button>
          <Button
            danger type='primary'
            onClick={() => handleClearItems()}
          >
            Clear Items
          </Button>
          <Button
            type='primary'
            onClick={() => handleExportTitlesToClipboard()}
          >
            Export Titles to Clipboard ({allEbayHuntedProducts?.length || 0})
          </Button>
        </Row>
      </Row>
      <Row className={classes.productsBox}>
        {
          allEbayHuntedProducts?.map((item, index) => (
            <Card
              key={index}
              style={{ width: '100%' }}
            >
              <Row
                style={{ width: '100%' }}
              >
                <Col
                  span={5}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Image
                    width={160}
                    height={160}
                    style={{ height: '160px', width: '160px' }}
                    src={item?.image}
                  />
                </Col>
                <Col
                  span={15}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontFamily: 'sans-serif'
                    }}
                  >
                    {item?.title || 'N/A'}
                  </Text>
                  <Text strong>
                    Price:
                    {' '}
                    <Text type='secondary'>{item?.price || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Total Competitors:
                    {' '}
                    <Text type='secondary'>N/A</Text>
                  </Text>
                  <Text strong>
                    Date Sold:
                    {' '}
                    <Text type='secondary'>{item?.soldAt || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Item Number:
                    {' '}
                    <Text type='secondary'>{item?.itemNumber || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Seller Name:
                    {' '}
                    <Text type='secondary'>{item?.sellerName || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Break-even Price:
                    {' '}
                    <Text type='secondary'>{item?.breakevenPrice || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Total Sold:
                    {' '}
                    <Text type='secondary'>{item?.totalSold || 'N/A'}</Text>
                  </Text>
                  <div style={{
                    marginTop: '15px',
                    marginLeft: '15px',
                    border: '1px solid grey',
                    width: '200px'
                  }}>
                    <Row style={{
                      backgroundColor: '#4691fd'

                    }}>
                      <Col span={12} className={classes.soldHistoryStyling}>
                        <div>Last X Days</div>
                      </Col>
                      <Col span={12} className={classes.soldHistoryStyling}>
                        <div>Total Sold</div>
                      </Col>
                    </Row>

                    {item?.updatedSoldHistory?.map((item, index) => (
                      <Row key={index}>
                        <Col span={12} className={classes.soldHistoryStyling}>
                          {item.days}
                        </Col>
                        <Col span={12} className={classes.soldHistoryStyling}>
                          <span>{item.totalSold}</span>
                        </Col>
                      </Row>
                    ))}
                  </div>
                </Col>
                <Col span={4}>
                  <Row style={{ justifyContent: 'center' }}>
                    <Col>
                      <IconWithTooltip
                        element={
                          <div
                            className={classes.actionButton}
                            onClick={() => handleOpenNewTab('ebay', `/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${item.sellerName}&store_name=${item.sellerName}&_ipg=240&_oac=1&LH_Sold=1`)}
                          >
                            <BsPersonCircle
                              size={24}
                              color='black'
                              className='icon'
                            />
                          </div>
                        }
                        tooltip="Open ebay's seller sold items"
                      />
                      <IconWithTooltip
                        element={
                          <div
                            className={classes.actionButton}
                            onClick={() => handleOpenNewTab('ebay', `/bin/purchaseHistory?item=${item.itemNumber}`)}
                          >
                            <FcStatistics
                              size={24}
                              color='blue'
                              className='icon'
                            />
                          </div>
                        }
                        tooltip='Check how many sold'
                      />
                      <IconWithTooltip
                        element={
                          <div
                            className={classes.actionButton}
                            onClick={() => copyToClip({
                              title: item.title,
                              price: item.price,
                              itemNumber: item.itemNumber,
                              image: item.image,
                              username: item.sellerName
                            })}
                          >
                            <IoMdCopy
                              size={24}
                              className='icon'
                            />
                          </div>
                        }
                        tooltip='Snipe the Title and Price, Saves this to Clipboard'
                      />
                      <IconWithTooltip
                        element={
                          <div
                            className={classes.actionButton}
                            onClick={() => saveEbaySeller(item.sellerName)}
                          >
                            <IoIosSave
                              size={24}
                              color='#a5c7fa'
                              className='icon'
                            />
                          </div>
                        }
                        tooltip='Save eBay Seller'
                      />
                      <IconWithTooltip
                        element={
                          <div type='primary' className={classes.actionButton}>
                            <img
                              className='icon'
                              style={{
                                width: '27px',
                                height: '27px',
                                cursor: 'pointer'
                              }}
                              src={ebay}
                              alt='NO_IMAGE'
                              onClick={() => handleOpenNewTab('ebay', `/sch/i.html?_from=R40&_trksid=p4432023.m570.l1313&_nkw=${item.title}&_sacat=0`)}
                            />
                          </div>
                        }
                        tooltip='Search eBay for this item'
                      />
                    </Col>
                    <Col>
                      <IconWithTooltip
                        element={
                          <div type='primary' className={classes.actionButton}>
                            <img
                              className='icon'
                              style={{
                                width: '27px',
                                height: '27px',
                                cursor: 'pointer'
                              }}
                              src={sold}
                              alt='NO_IMAGE'
                              onClick={() => handleOpenNewTab('ebay', `/sch/i.html?_nkw=${item.title}&_odkw=${item.title}&LH_Sold=1&_sop=13&LH_ItemCondition=1000&LH_FS=1`)}
                            />
                          </div>
                        }
                        tooltip='Search eBay for sold items'
                      />
                      <IconWithTooltip
                        element={
                          <div type='primary' className={classes.actionButton}>
                            <img
                              className='icon'
                              style={{
                                width: '27px',
                                height: '27px',
                                cursor: 'pointer'
                              }}
                              src={amazon}
                              alt='NO_IMAGE'
                              onClick={() => handleOpenNewTab('amazon', `/s?k=${item.title}`)}
                            />
                          </div>
                        }
                        tooltip='Search Amazon for this item'
                      />
                      <IconWithTooltip
                        element={
                          <div type='primary' className={classes.actionButton}>
                            <img
                              className='icon'
                              style={{
                                width: '27px',
                                height: '27px',
                                cursor: 'pointer'
                              }}
                              src={teraPeak}
                              alt='NO_IMAGE'
                              onClick={() => handleTerapeakSearch(item.title)}
                            />
                          </div>
                        }
                        tooltip='Search Terapeak for this item'
                      />
                      <IconWithTooltip
                        element={
                          <div type='primary' className={classes.actionButton}>
                            <img
                              className='icon'
                              style={{
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer'
                              }}
                              src={googleLens}
                              alt='NO_IMAGE'
                              onClick={() => window.open(`https://lens.google.com/uploadbyurl?url=${item.image}&hl=en-US`, '_blank')}
                            />
                          </div>
                        }
                        tooltip='Search Google for this item'
                      />
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card>
          ))
        }
      </Row>
    </div>
  );
};

export default EbayItemsScanner;
